const { createHash } = require('node:crypto');
const { BSON } = require('mongoose').mongo;
const { readRecords } = require('./archive');
const { requireThat, collectionName, databaseName, validAsset } = require('./safety');
const { GUARD_COLLECTION } = require('./mongoSnapshot');

// A bounded-memory state machine validates structure, metadata and every file before restore.
async function inspect(payload) {
  let manifest, collection, collectionIndex = 0, documents = 0, ended = false, currentFile;
  const counts = {}, assets = new Map(), schools = new Map(), seen = new Set();
  let hasMfa = false, fileBytes = 0;
  for await (const record of readRecords(payload)) {
    requireThat(!ended, 'TRAILING_RECORDS');
    if (!manifest) {
      requireThat(record.kind === 'manifest' && record.version === 1 && databaseName(record.database) && record.createdAt instanceof Date && Number.isFinite(record.createdAt.getTime()), 'INVALID_MANIFEST');
      requireThat(/^[a-f0-9]{64}$/.test(record.sourceJwtFingerprint) && (record.mfaKeyFingerprint === null || /^[a-f0-9]{64}$/.test(record.mfaKeyFingerprint)), 'INVALID_KEY_METADATA');
      requireThat(Array.isArray(record.collections) && record.collections.length > 0 && record.collections.length <= 1000, 'INVALID_COLLECTION_COUNT');
      const names = new Set();
      for (const item of record.collections) {
        requireThat(collectionName(item.name) && item.name !== GUARD_COLLECTION && !names.has(item.name) && Array.isArray(item.indexes) && item.indexes.length <= 64, 'INVALID_COLLECTION_METADATA');
        requireThat(item.options && Object.keys(item.options).every(key => ['validator', 'validationLevel', 'validationAction', 'collation'].includes(key)), 'UNSUPPORTED_COLLECTION_OPTIONS');
        for (const index of item.indexes) requireThat(index && typeof index.name === 'string' && index.key && typeof index.key === 'object' && !Array.isArray(index.key) && index.name !== '_id_', 'INVALID_INDEX');
        names.add(item.name);
      }
      manifest = record; continue;
    }
    if (record.kind === 'collection') {
      requireThat(!collection && !currentFile && !seen.size && manifest.collections[collectionIndex]?.name === record.name, 'INVALID_COLLECTION_ORDER');
      collection = record.name; documents = 0;
    } else if (record.kind === 'document') {
      requireThat(!!collection && Buffer.isBuffer(record.data) && record.data.length >= 5 && record.data.length <= 16 * 1024 ** 2, 'INVALID_DOCUMENT');
      requireThat(record.data.readInt32LE() === record.data.length, 'INVALID_DOCUMENT_SIZE');
      const doc = BSON.deserialize(record.data);
      requireThat(Object.hasOwn(doc, '_id'), 'DOCUMENT_ID_REQUIRED');
      if (collection === 'fileassets') {
        requireThat(validAsset(doc) && !assets.has(String(doc._id)), 'INVALID_FILE_ASSET');
        requireThat(assets.size < 100000, 'FILE_COUNT_LIMIT');
        assets.set(String(doc._id), { _id: doc._id, schoolId: doc.schoolId, key: doc.key, sha256: doc.sha256, sizeBytes: doc.sizeBytes });
      }
      if (collection === 'schools') schools.set(String(doc._id), Number(doc.storageUsedBytes || 0));
      if (collection === 'users' && doc.security?.mfaEnabled) hasMfa = true;
      if (collection === 'jobs') requireThat(doc.status !== 'RUNNING', 'RUNNING_JOBS_REQUIRE_REVIEW');
      documents++;
    } else if (record.kind === 'collection-end') {
      requireThat(!!collection && record.count === documents, 'COLLECTION_COUNT_MISMATCH');
      counts[collection] = documents; collectionIndex++; collection = null;
    } else if (record.kind === 'file') {
      requireThat(!collection && collectionIndex === manifest.collections.length && !currentFile && assets.has(record.assetId) && !seen.has(record.assetId), 'INVALID_FILE_ORDER');
      currentFile = { asset: assets.get(record.assetId), hash: createHash('sha256'), bytes: 0 };
    } else if (record.kind === 'chunk') {
      requireThat(!!currentFile && Buffer.isBuffer(record.data) && record.data.length > 0 && record.data.length <= 65536, 'INVALID_FILE_CHUNK');
      currentFile.bytes += record.data.length;
      requireThat(currentFile.bytes <= currentFile.asset.sizeBytes, 'FILE_SIZE_MISMATCH');
      currentFile.hash.update(record.data);
    } else if (record.kind === 'file-end') {
      requireThat(!!currentFile, 'INVALID_FILE_ORDER');
      requireThat(currentFile.bytes === currentFile.asset.sizeBytes && currentFile.hash.digest('hex') === currentFile.asset.sha256, 'FILE_CHECKSUM_MISMATCH');
      fileBytes += currentFile.bytes; seen.add(String(currentFile.asset._id)); currentFile = null;
    } else if (record.kind === 'end') {
      requireThat(!collection && !currentFile && collectionIndex === manifest.collections.length && seen.size === assets.size, 'INCOMPLETE_SNAPSHOT');
      ended = true;
    } else requireThat(false, 'UNKNOWN_RECORD');
  }
  requireThat(ended && !!manifest, 'INCOMPLETE_SNAPSHOT');
  requireThat(!hasMfa || !!manifest.mfaKeyFingerprint, 'MFA_KEY_METADATA_REQUIRED');
  const totals = new Map(), keys = new Set();
  for (const asset of assets.values()) {
    requireThat(schools.has(String(asset.schoolId)) && !keys.has(asset.key), 'FILE_TENANT_MISMATCH');
    keys.add(asset.key);
    totals.set(String(asset.schoolId), (totals.get(String(asset.schoolId)) || 0) + asset.sizeBytes);
  }
  for (const [school, quota] of schools) requireThat(Number.isSafeInteger(quota) && quota === (totals.get(school) || 0), 'STORAGE_QUOTA_MISMATCH');
  return { manifest, counts, assets, files: seen.size, fileBytes };
}
module.exports = { inspect };
