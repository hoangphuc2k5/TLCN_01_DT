const { BSON } = require('mongoose').mongo;
const { requireThat, collectionName, databaseName, fingerprint } = require('./safety');
const { GUARD_COLLECTION, assertUsable } = require('./restoreGuard');

async function catalog(db, { maintenance, jwtSecret, mfaKey }) {
  requireThat(maintenance === true, 'MAINTENANCE_REQUIRED');
  requireThat(databaseName(db.databaseName), 'UNSUPPORTED_DATABASE');
  requireThat(typeof jwtSecret === 'string' && jwtSecret.length > 0, 'SOURCE_JWT_SECRET_REQUIRED');
  await assertUsable(db, { jwtSecret, mfaKey });
  const collections = (await db.listCollections({}, { nameOnly: false }).toArray()).filter(c => c.name !== GUARD_COLLECTION);
  requireThat(collections.length > 0 && collections.length <= 1000, 'INVALID_COLLECTION_COUNT');
  requireThat(!await db.collection('fileassets').findOne({ status: { $ne: 'READY' } }), 'UNFINISHED_FILE_OPERATIONS');
  requireThat(!await db.collection('jobs').findOne({ status: 'RUNNING' }), 'RUNNING_JOBS_REQUIRE_REVIEW');
  const hasMfa = !!await db.collection('users').findOne({ 'security.mfaEnabled': true }, { projection: { _id: 1 } });
  if (hasMfa) requireThat(typeof mfaKey === 'string' && /^[a-f0-9]{64}$/i.test(mfaKey), 'MFA_KEY_REQUIRED');
  const metadata = [];
  for (const collection of collections.sort((a, b) => a.name.localeCompare(b.name))) {
    requireThat(collectionName(collection.name) && collection.type === 'collection', 'UNSUPPORTED_COLLECTION');
    const options = collection.options || {};
    requireThat(Object.keys(options).every(key => ['validator', 'validationLevel', 'validationAction', 'collation'].includes(key)), 'UNSUPPORTED_COLLECTION_OPTIONS');
    const indexes = await db.collection(collection.name).listIndexes().toArray();
    metadata.push({ name: collection.name, options, indexes: indexes.filter(i => i.name !== '_id_').map(({ v, ns, background, ...index }) => index) });
  }
  return { kind: 'manifest', version: 1, createdAt: new Date(), database: db.databaseName,
    sourceJwtFingerprint: fingerprint(jwtSecret), mfaKeyFingerprint: hasMfa ? fingerprint(Buffer.from(mfaKey, 'hex')) : null, collections: metadata };
}

async function* records(db, metadata) {
  for (const collection of metadata.collections) {
    yield { kind: 'collection', name: collection.name };
    let count = 0;
    // Raw BSON avoids number promotion and bypasses Mongoose's select:false projection.
    const cursor = db.collection(collection.name).find({}, { raw: true, batchSize: 100 });
    try {
      for await (const data of cursor) { yield { kind: 'document', data }; count++; }
    } finally { await cursor.close(); }
    yield { kind: 'collection-end', count };
  }
}

function restoredDocument(name, raw) {
  const doc = BSON.deserialize(raw, { promoteValues: false });
  if (name === 'authattempts') return null;
  if (name === 'users') {
    // JWT key rotation is mandatory; this version increment alone cannot revoke tokens
    // issued AFTER the snapshot. Clear temporary proof state as a second safeguard.
    doc.security ||= {};
    doc.security.sessionVersion = Number(doc.security.sessionVersion || 0) + 1;
    doc.security.revision = Number(doc.security.revision || 0) + 1;
    doc.security.challenge = null; doc.security.setup = null;
    // Codes used after the backup must not become valid again after rollback.
    doc.security.recoveryHashes = [];
    doc.security.lastCounter = Math.max(Number(doc.security.lastCounter ?? -1), Math.floor(Date.now() / 30000));
  }
  if (name === 'fileassets') { doc.driver = 'local'; doc.bucket = ''; }
  if (name === 'jobs' && ['QUEUED', 'RUNNING'].includes(doc.status)) {
    doc.status = 'CANCELLED'; doc.outcome = 'RESTORE_REVIEW_REQUIRED'; doc.finishedAt = new Date();
    doc.lockToken = null; doc.lockedUntil = null;
  }
  if (name === 'notifications' && ['PENDING', 'ENQUEUED'].includes(doc.emailState)) doc.emailState = 'NOT_REQUESTED';
  return doc;
}
module.exports = { catalog, records, restoredDocument, GUARD_COLLECTION };
