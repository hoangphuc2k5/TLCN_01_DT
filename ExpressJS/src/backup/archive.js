const fs = require('node:fs/promises');
const { createWriteStream } = require('node:fs');
const path = require('node:path');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { randomBytes, randomUUID, createCipheriv, createDecipheriv } = require('node:crypto');
const { BSON } = require('mongoose').mongo;
const { BackupError, requireThat, safePath, encryptionKey } = require('./safety');

const MAGIC = Buffer.from('EDUBAK01');
const HEADER_SIZE = MAGIC.length + 12;
const MAX_FRAME = 17 * 1024 * 1024;
const DEFAULT_MAX_BYTES = 10 * 1024 ** 3;
function byteLimit(maxBytes) {
  requireThat(Number.isSafeInteger(maxBytes) && maxBytes > 0 && maxBytes <= 50 * 1024 ** 3, 'INVALID_SIZE_LIMIT');
  let size = 0;
  return new Transform({ transform(chunk, _encoding, done) {
    size += chunk.length;
    done(size > maxBytes ? new BackupError('BACKUP_SIZE_LIMIT') : null, chunk);
  } });
}

async function writeArchive(filename, records, keyHex, { maxBytes = DEFAULT_MAX_BYTES } = {}) {
  const key = encryptionKey(keyHex);
  const target = await safePath(filename);
  await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const partial = `${target}.partial-${randomUUID()}`;
  const header = Buffer.concat([MAGIC, randomBytes(12)]);
  const cipher = createCipheriv('aes-256-gcm', key, header.subarray(MAGIC.length));
  cipher.setAAD(header);
  await fs.writeFile(partial, header, { flag: 'wx', mode: 0o600 });
  try {
    async function* frames() {
      for await (const record of records) {
        const frame = BSON.serialize(record);
        requireThat(frame.length <= MAX_FRAME, 'FRAME_TOO_LARGE');
        yield frame;
      }
    }
    await pipeline(Readable.from(frames()), byteLimit(maxBytes), cipher, createWriteStream(partial, { flags: 'a' }));
    const handle = await fs.open(partial, 'a');
    try { await handle.write(cipher.getAuthTag()); await handle.sync(); } finally { await handle.close(); }
    // Same-directory hard link atomically publishes the complete file without overwriting.
    await fs.link(partial, target);
    return { filename: target, bytes: (await fs.stat(target)).size };
  } finally { await fs.rm(partial, { force: true }); }
}

async function* readRecords(filename) {
  const handle = await fs.open(filename, 'r');
  try {
    let position = 0;
    async function readExactly(buffer) {
      let offset = 0;
      while (offset < buffer.length) {
        const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, position);
        if (!bytesRead) return offset;
        position += bytesRead; offset += bytesRead;
      }
      return offset;
    }
    while (true) {
      const prefix = Buffer.alloc(4);
      const bytes = await readExactly(prefix);
      if (!bytes) return;
      requireThat(bytes === 4, 'TRUNCATED_FRAME');
      const size = prefix.readInt32LE();
      requireThat(size >= 5 && size <= MAX_FRAME, 'INVALID_FRAME_SIZE');
      const buffer = Buffer.alloc(size); prefix.copy(buffer);
      requireThat(await readExactly(buffer.subarray(4)) === size - 4, 'TRUNCATED_FRAME');
      try { yield BSON.deserialize(buffer, { promoteBuffers: true }); }
      catch (error) { if (error instanceof BackupError) throw error; throw new BackupError('INVALID_BSON_FRAME'); }
    }
  } finally { await handle.close(); }
}

// Authenticate the ENTIRE ciphertext before a parser or database writer sees plaintext.
async function withVerifiedPayload(filename, keyHex, stagingRoot, operation, { maxBytes = DEFAULT_MAX_BYTES } = {}) {
  const key = encryptionKey(keyHex);
  const source = await safePath(filename);
  const root = await safePath(stagingRoot);
  await fs.mkdir(root, { recursive: true, mode: 0o700 });
  const stage = await fs.mkdtemp(path.join(root, 'verify-'));
  await fs.chmod(stage, 0o700);
  try {
    const handle = await fs.open(source, 'r');
    try {
      const stat = await handle.stat();
      requireThat(stat.isFile() && stat.size >= HEADER_SIZE + 16 && stat.size <= maxBytes + HEADER_SIZE + 16, 'INVALID_ARCHIVE_SIZE');
      const header = Buffer.alloc(HEADER_SIZE), tag = Buffer.alloc(16);
      await handle.read(header, 0, header.length, 0);
      requireThat(header.subarray(0, MAGIC.length).equals(MAGIC), 'UNSUPPORTED_ARCHIVE');
      await handle.read(tag, 0, 16, stat.size - 16);
      const decipher = createDecipheriv('aes-256-gcm', key, header.subarray(MAGIC.length));
      decipher.setAAD(header); decipher.setAuthTag(tag);
      const payload = path.join(stage, 'payload.bson');
      try {
        await pipeline(handle.createReadStream({ start: HEADER_SIZE, end: stat.size - 17, autoClose: false }),
          decipher, byteLimit(maxBytes), createWriteStream(payload, { flags: 'wx', mode: 0o600 }));
      } catch (error) {
        if (error instanceof BackupError) throw error;
        throw new BackupError('ARCHIVE_AUTHENTICATION_FAILED');
      }
      return await operation(payload);
    } finally { await handle.close(); }
  } finally {
    requireThat(path.dirname(stage) === root && path.basename(stage).startsWith('verify-'), 'UNSAFE_STAGING_CLEANUP');
    await fs.rm(stage, { recursive: true, force: true });
  }
}
module.exports = { writeArchive, withVerifiedPayload, readRecords, DEFAULT_MAX_BYTES };
