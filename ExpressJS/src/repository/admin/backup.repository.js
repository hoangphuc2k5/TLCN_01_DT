const { BSON } = require('mongoose').mongo;
const {
  requireThat,
  collectionName,
  databaseName,
  fingerprint,
  RESTORE_GUARD_COLLECTION,
} = require('../../utils/common/backup/backup-safety.util');

const GUARD_COLLECTION = RESTORE_GUARD_COLLECTION;

async function assertUsable(
  db,
  {
    jwtSecret = process.env.JWT_SECRET,
    mfaKey = process.env.AUTH_MFA_ENCRYPTION_KEY,
  } = {}
) {
  const cursor = db.listCollections({ name: GUARD_COLLECTION }, { nameOnly: true });
  try {
    if (!await cursor.hasNext()) return;
    const marker = await db.collection(GUARD_COLLECTION).findOne({ _id: 'restore' });
    requireThat(marker?.status === 'COMPLETE', 'RESTORE_INCOMPLETE');
    requireThat(
      typeof jwtSecret === 'string' && fingerprint(jwtSecret) === marker.jwtFingerprint,
      'RESTORE_JWT_CONFIG_MISMATCH'
    );
    if (marker.mfaKeyFingerprint) {
      requireThat(
        typeof mfaKey === 'string'
          && /^[a-f0-9]{64}$/i.test(mfaKey)
          && fingerprint(Buffer.from(mfaKey, 'hex')) === marker.mfaKeyFingerprint,
        'RESTORE_MFA_CONFIG_MISMATCH'
      );
    }
  } finally {
    await cursor.close();
  }
}

class BackupRepository {
  constructor({ database }) {
    this.database = database;
  }

  async catalog(db, { maintenance, jwtSecret, mfaKey }) {
    requireThat(maintenance === true, 'MAINTENANCE_REQUIRED');
    requireThat(databaseName(db.databaseName), 'UNSUPPORTED_DATABASE');
    requireThat(typeof jwtSecret === 'string' && jwtSecret.length > 0, 'SOURCE_JWT_SECRET_REQUIRED');
    await assertUsable(db, { jwtSecret, mfaKey });
    const collections = (await db.listCollections({}, { nameOnly: false }).toArray())
      .filter(collection => collection.name !== GUARD_COLLECTION);
    requireThat(collections.length > 0 && collections.length <= 1000, 'INVALID_COLLECTION_COUNT');
    requireThat(!await db.collection('fileassets').findOne({ status: { $ne: 'READY' } }), 'UNFINISHED_FILE_OPERATIONS');
    requireThat(!await db.collection('jobs').findOne({ status: 'RUNNING' }), 'RUNNING_JOBS_REQUIRE_REVIEW');
    const hasMfa = !!await db.collection('users').findOne(
      { 'security.mfaEnabled': true },
      { projection: { _id: 1 } }
    );
    if (hasMfa) {
      requireThat(typeof mfaKey === 'string' && /^[a-f0-9]{64}$/i.test(mfaKey), 'MFA_KEY_REQUIRED');
    }
    const metadata = [];
    for (const collection of collections.sort((a, b) => a.name.localeCompare(b.name))) {
      requireThat(collectionName(collection.name) && collection.type === 'collection', 'UNSUPPORTED_COLLECTION');
      const options = collection.options || {};
      requireThat(
        Object.keys(options).every(key => ['validator', 'validationLevel', 'validationAction', 'collation'].includes(key)),
        'UNSUPPORTED_COLLECTION_OPTIONS'
      );
      const indexes = await db.collection(collection.name).listIndexes().toArray();
      metadata.push({
        name: collection.name,
        options,
        indexes: indexes
          .filter(index => index.name !== '_id_')
          .map(({ v, ns, background, ...index }) => index),
      });
    }
    return {
      kind: 'manifest',
      version: 1,
      createdAt: new Date(),
      database: db.databaseName,
      sourceJwtFingerprint: fingerprint(jwtSecret),
      mfaKeyFingerprint: hasMfa ? fingerprint(Buffer.from(mfaKey, 'hex')) : null,
      collections: metadata,
    };
  }

  async *records(db, metadata) {
    for (const collection of metadata.collections) {
      yield { kind: 'collection', name: collection.name };
      let count = 0;
      const cursor = db.collection(collection.name).find({}, { raw: true, batchSize: 100 });
      try {
        for await (const data of cursor) {
          yield { kind: 'document', data };
          count += 1;
        }
      } finally {
        await cursor.close();
      }
      yield { kind: 'collection-end', count };
    }
  }

  async *fileAssets(db) {
    const cursor = db.collection('fileassets').find({}).sort({ _id: 1 });
    try {
      for await (const asset of cursor) yield asset;
    } finally {
      await cursor.close();
    }
  }

  async targetIsEmpty(db) {
    return (await db.listCollections().toArray()).length === 0;
  }

  async claimRestore(db, marker) {
    await db.createCollection(GUARD_COLLECTION);
    await db.collection(GUARD_COLLECTION).insertOne(marker);
  }

  createCollection(db, name, options) {
    return db.createCollection(name, options);
  }

  insertDocuments(db, collection, documents) {
    return db.collection(collection).insertMany(documents, { ordered: true });
  }

  createIndexes(db, collection, indexes) {
    return db.collection(collection).createIndexes(indexes);
  }

  completeRestore(db) {
    return db.collection(GUARD_COLLECTION).updateOne(
      { _id: 'restore', status: 'RESTORING' },
      { $set: { status: 'COMPLETE', completedAt: new Date() } }
    );
  }

  failRestore(db) {
    return db.collection(GUARD_COLLECTION).updateOne(
      { _id: 'restore' },
      { $set: { status: 'FAILED', failedAt: new Date() } }
    );
  }

  restoredDocument(name, raw) {
    const doc = BSON.deserialize(raw, { promoteValues: false });
    if (name === 'authattempts') return null;
    if (name === 'users') {
      doc.security ||= {};
      doc.security.sessionVersion = Number(doc.security.sessionVersion || 0) + 1;
      doc.security.revision = Number(doc.security.revision || 0) + 1;
      doc.security.challenge = null;
      doc.security.setup = null;
      doc.security.recoveryHashes = [];
      doc.security.lastCounter = Math.max(
        Number(doc.security.lastCounter ?? -1),
        Math.floor(Date.now() / 30000)
      );
    }
    if (name === 'fileassets') {
      doc.driver = 'local';
      doc.bucket = '';
    }
    if (name === 'jobs' && ['QUEUED', 'RUNNING'].includes(doc.status)) {
      doc.status = 'CANCELLED';
      doc.outcome = 'RESTORE_REVIEW_REQUIRED';
      doc.finishedAt = new Date();
      doc.lockToken = null;
      doc.lockedUntil = null;
    }
    if (name === 'notifications' && ['PENDING', 'ENQUEUED'].includes(doc.emailState)) {
      doc.emailState = 'NOT_REQUESTED';
    }
    return doc;
  }

  assertUsable(db, options) {
    return assertUsable(db, options);
  }
}

module.exports = BackupRepository;
module.exports.assertUsable = assertUsable;
module.exports.GUARD_COLLECTION = GUARD_COLLECTION;
