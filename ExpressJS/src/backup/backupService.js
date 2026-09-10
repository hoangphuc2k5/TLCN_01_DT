const fs = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const mongo = require('./mongoSnapshot');
const archive = require('./archive');
const { inspect } = require('./snapshotValidator');
const { requireThat, validAsset, safePath, isWithin, fingerprint, databaseName } = require('./safety');

async function readAsset(asset, localRoot) {
  if (asset.driver === 's3') return require('../services/fileStorage').adapter('s3').read(asset);
  const filename = await safePath(path.join(localRoot, ...asset.key.split('/')));
  requireThat((await fs.lstat(filename)).isFile(), 'FILE_NOT_REGULAR');
  return createReadStream(filename, { highWaterMark: 65536 });
}

async function* snapshotRecords(db, manifest, options) {
  yield manifest;
  yield* mongo.records(db, manifest);
  const cursor = db.collection('fileassets').find({}).sort({ _id: 1 });
  try {
    for await (const asset of cursor) {
      requireThat(validAsset(asset), 'INVALID_FILE_ASSET');
      yield { kind: 'file', assetId: String(asset._id) };
      const stream = await (options.readAsset || readAsset)(asset, options.localRoot);
      const hash = createHash('sha256'); let size = 0;
      try {
        for await (const chunk of stream) {
          const bytes = Buffer.from(chunk); size += bytes.length; hash.update(bytes);
          requireThat(size <= asset.sizeBytes, 'FILE_SIZE_MISMATCH');
          for (let offset = 0; offset < bytes.length; offset += 65536) yield { kind: 'chunk', data: bytes.subarray(offset, offset + 65536) };
        }
      } finally { stream.destroy?.(); }
      requireThat(size === asset.sizeBytes && hash.digest('hex') === asset.sha256, 'FILE_CHECKSUM_MISMATCH');
      yield { kind: 'file-end' };
    }
  } finally { await cursor.close(); }
  yield { kind: 'end' };
}

function summary(checked) {
  return { version: checked.manifest.version, createdAt: checked.manifest.createdAt,
    database: checked.manifest.database, collections: checked.counts,
    files: checked.files, fileBytes: checked.fileBytes, requiresMfaKey: !!checked.manifest.mfaKeyFingerprint };
}
const verify = options => archive.withVerifiedPayload(options.filename, options.key, options.stagingRoot,
  async payload => summary(await inspect(payload)), options);

async function create(db, options) {
  const manifest = await mongo.catalog(db, options);
  const filename = await safePath(options.filename);
  const localRoot = await safePath(options.localRoot);
  requireThat(!isWithin(localRoot, filename), 'BACKUP_INSIDE_FILE_STORAGE');
  const candidate = `${filename}.checking-${randomUUID()}`;
  try {
    await archive.writeArchive(candidate, snapshotRecords(db, manifest, { ...options, localRoot }), options.key, options);
    const report = await verify({ ...options, filename: candidate });
    await fs.link(candidate, filename);
    return { ...report, filename, bytes: (await fs.stat(filename)).size };
  } finally { await fs.rm(candidate, { force: true }); }
}

async function targetPreflight(db, checked, options) {
  requireThat(options.maintenance === true, 'MAINTENANCE_REQUIRED');
  requireThat(databaseName(db.databaseName) && db.databaseName === options.targetDatabase && db.databaseName !== checked.manifest.database, 'NEW_TARGET_DATABASE_REQUIRED');
  requireThat(typeof options.jwtSecret === 'string' && options.jwtSecret.length >= 32 && fingerprint(options.jwtSecret) !== checked.manifest.sourceJwtFingerprint, 'ROTATED_JWT_SECRET_REQUIRED');
  if (checked.manifest.mfaKeyFingerprint) requireThat(typeof options.mfaKey === 'string' && /^[a-f0-9]{64}$/i.test(options.mfaKey) && fingerprint(Buffer.from(options.mfaKey, 'hex')) === checked.manifest.mfaKeyFingerprint, 'MFA_KEY_MISMATCH');
  const root = await safePath(options.localRoot);
  requireThat(!isWithin(await safePath(options.stagingRoot), root), 'TARGET_INSIDE_STAGING');
  try { await fs.lstat(root); requireThat(false, 'NEW_STORAGE_ROOT_REQUIRED'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  requireThat((await db.listCollections().toArray()).length === 0, 'TARGET_DATABASE_NOT_EMPTY');
  return root;
}

async function restore(db, options) {
  return archive.withVerifiedPayload(options.filename, options.key, options.stagingRoot, async payload => {
    const checked = await inspect(payload);
    const root = await targetPreflight(db, checked, options);
    const plan = { ...summary(checked), targetDatabase: db.databaseName, localRoot: root,
      actions: ['preserve_ids_indexes_and_totp_secret', 'require_rotated_jwt', 'clear_auth_challenges_attempts_and_recovery_codes', 'cancel_pending_jobs', 'suppress_pending_email', 'restore_files_to_local'] };
    if (options.apply !== true) return { ...plan, applied: false };

    // Claim a fresh target atomically. Never drop or overwrite an existing namespace.
    await db.createCollection(mongo.GUARD_COLLECTION);
    let guardCreated = false;
    try {
      await db.collection(mongo.GUARD_COLLECTION).insertOne({ _id: 'restore', status: 'RESTORING', startedAt: new Date(),
        jwtFingerprint: fingerprint(options.jwtSecret), mfaKeyFingerprint: checked.manifest.mfaKeyFingerprint });
      guardCreated = true;
      await fs.mkdir(path.dirname(root), { recursive: true, mode: 0o700 });
      await fs.mkdir(root, { mode: 0o700 });
      let collection, batch = [], batchBytes = 0, fileHandle;
      async function flush() {
        if (batch.length) { await db.collection(collection).insertMany(batch, { ordered: true }); batch = []; batchBytes = 0; }
      }
      try {
        for await (const record of archive.readRecords(payload)) {
          if (record.kind === 'collection') {
            collection = record.name;
            const metadata = checked.manifest.collections.find(c => c.name === collection);
            await db.createCollection(collection, metadata.options);
          } else if (record.kind === 'document') {
            const doc = mongo.restoredDocument(collection, record.data);
            if (doc) { batch.push(doc); batchBytes += record.data.length; }
            if (batch.length >= 100 || batchBytes >= 4 * 1024 ** 2) await flush();
          } else if (record.kind === 'collection-end') {
            await flush(); collection = null;
          } else if (record.kind === 'file') {
            const asset = checked.assets.get(record.assetId);
            const filename = await safePath(path.join(root, ...asset.key.split('/')));
            requireThat(isWithin(root, filename), 'UNSAFE_FILE_PATH');
            await fs.mkdir(path.dirname(filename), { recursive: true, mode: 0o700 });
            fileHandle = await fs.open(filename, 'wx', 0o600);
          } else if (record.kind === 'chunk') {
            await fileHandle.writeFile(record.data);
          } else if (record.kind === 'file-end') {
            await fileHandle.sync(); await fileHandle.close(); fileHandle = null;
          }
        }
      } finally { if (fileHandle) await fileHandle.close(); }
      for (const metadata of checked.manifest.collections) {
        if (metadata.indexes.length) await db.collection(metadata.name).createIndexes(metadata.indexes);
      }
      const result = { ...plan, applied: true, restoredAt: new Date(), pendingJobsRequireReview: true };
      await fs.writeFile(path.join(root, '.restore-report.json'), JSON.stringify({ ...plan, dataCopied: true, restoredAt: result.restoredAt, commitCheck: 'restoreguard must have status COMPLETE and matching key fingerprints' }, null, 2), { flag: 'wx', mode: 0o600 });
      // Keep a permanent unique claim: a late concurrent restore cannot reclaim this DB.
      const committed = await db.collection(mongo.GUARD_COLLECTION).updateOne({ _id: 'restore', status: 'RESTORING' }, { $set: { status: 'COMPLETE', completedAt: new Date() } });
      requireThat(committed.modifiedCount === 1, 'RESTORE_COMMIT_FAILED');
      return result;
    } catch (error) {
      if (guardCreated) await db.collection(mongo.GUARD_COLLECTION).updateOne({ _id: 'restore' }, { $set: { status: 'FAILED', failedAt: new Date() } }).catch(() => {});
      throw error;
    }
  }, options);
}
module.exports = { create, verify, restore, readAsset };
