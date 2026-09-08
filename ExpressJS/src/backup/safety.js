const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');

class BackupError extends Error {
  constructor(code, message = code) { super(message); this.name = 'BackupError'; this.code = code; }
}
function requireThat(condition, code) { if (!condition) throw new BackupError(code); }
function encryptionKey(value) {
  requireThat(typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value), 'BACKUP_KEY_REQUIRED');
  return Buffer.from(value, 'hex');
}
const fingerprint = value => createHash('sha256').update(value).digest('hex');
const collectionName = value => typeof value === 'string' && /^[a-zA-Z][a-zA-Z0-9_]{0,119}$/.test(value);
const databaseName = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,63}$/.test(value) && !['admin', 'local', 'config'].includes(value.toLowerCase());
function validAsset(asset) {
  return asset && /^[a-f0-9]{24}$/.test(String(asset._id)) && /^[a-f0-9]{24}$/.test(String(asset.schoolId)) &&
    typeof asset.key === 'string' && new RegExp(`^${asset.schoolId}/[a-f0-9-]{36}$`).test(asset.key) &&
    /^[a-f0-9]{64}$/.test(asset.sha256) && Number.isSafeInteger(asset.sizeBytes) && asset.sizeBytes > 0 &&
    asset.status === 'READY' && ['local', 's3'].includes(asset.driver);
}
async function safePath(value) {
  requireThat(typeof value === 'string' && path.isAbsolute(value), 'ABSOLUTE_PATH_REQUIRED');
  const resolved = path.resolve(value);
  let current = resolved;
  while (true) {
    try { requireThat(!(await fs.lstat(current)).isSymbolicLink(), 'SYMLINK_NOT_ALLOWED'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return resolved;
}
const isWithin = (root, candidate) => {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};
module.exports = { BackupError, requireThat, encryptionKey, fingerprint, collectionName, databaseName, validAsset, safePath, isWithin };
