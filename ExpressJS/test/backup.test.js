const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const { Readable } = require('node:stream');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, BSON, ObjectId } = mongoose.mongo;
Object.assign(process.env, { NODE_ENV: 'test', AUTH_MFA_ENCRYPTION_KEY: 'ab'.repeat(32), JWT_SECRET: 'source-jwt-for-isolated-backup-tests-only', ALLOW_PASSWORD_LOGIN: 'true', AUTH_GMAIL_ONLY: 'false', GOOGLE_CLIENT_ID: '', GMAIL_USER: '', GMAIL_APP_PASSWORD: '' });
const service = require('../src/backup/backupService');
const archive = require('../src/backup/archive');
const { fingerprint } = require('../src/backup/safety');
const { assertUsable } = require('../src/backup/restoreGuard');
const otp = require('../src/services/totpProvider');
const key = 'cd'.repeat(32), sourceJwt = process.env.JWT_SECRET, targetJwt = 'a-new-target-jwt-secret-for-isolated-tests-only';
let mongo, client, source, root, localRoot, stagingRoot, school, user, asset, body, mfa, server;
before(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'phase1-backup-'));
  stagingRoot = path.join(root, 'staging');
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { downloadDir: path.resolve(__dirname, '../node_modules/.cache/mongodb-memory-server') } });
  client = await new MongoClient(mongo.getUri()).connect();
  source = client.db('backup_source');
});
beforeEach(async () => {
  if (server) { await new Promise(resolve => server.close(resolve)); server = null; }
  await mongoose.disconnect();
  assert.equal(source.databaseName, 'backup_source'); await source.dropDatabase();
  process.env.JWT_SECRET = sourceJwt;
  localRoot = path.join(root, `files-${randomUUID()}`);
  school = { _id: new ObjectId(), name: 'Backup school', code: 'BK', subdomain: 'backup', status: 'ACTIVE', storageUsedBytes: 150000 };
  user = { _id: new ObjectId(), name: 'Backup account', email: 'backup@test.invalid', role: 'SUPER_ADMIN', status: 'ACTIVE', schoolId: school._id, password: await bcrypt.hash('A private fixture phrase!', 4), authProvider: 'password' };
  mfa = otp.create(user);
  user.security = { sessionVersion: 3, revision: 7, mfaEnabled: true, secret: mfa.encrypted, lastCounter: 0,
    recoveryHashes: [otp.digest('12'.repeat(16))], passwordHistory: [await bcrypt.hash('Previous fixture phrase!', 4)],
    challenge: { hash: 'old-challenge', expiresAt: new Date(Date.now() + 600000) }, setup: { secret: 'old-setup' } };
  body = Buffer.alloc(150000, 0x61); body.write('%PDF-1.4\nPrivate fixture content');
  asset = { _id: new ObjectId(), schoolId: school._id, uploadedBy: user._id, purpose: 'MATERIAL', originalName: 'Học bạ.pdf', mimeType: 'application/pdf', sizeBytes: body.length, sha256: fingerprint(body), driver: 'local', bucket: '', key: `${school._id}/${randomUUID()}`, status: 'READY' };
  await fs.mkdir(path.join(localRoot, String(school._id)), { recursive: true });
  await fs.writeFile(path.join(localRoot, ...asset.key.split('/')), body);
  await source.collection('schools').insertOne(school);
  await source.collection('users').insertOne(user);
  await source.collection('users').createIndex({ email: 1 }, { unique: true });
  await source.collection('roles').insertOne({ _id: new ObjectId(), code: 'SUPER_ADMIN', name: 'Super', level: 100, status: 'ACTIVE', permissions: [] });
  await source.collection('fileassets').insertOne(asset);
  await source.collection('fileassets').createIndex({ key: 1 }, { unique: true });
  await source.collection('learningmaterials').insertOne({ _id: new ObjectId(), schoolId: school._id, uploadedBy: user._id, title: 'Recovered material', fileAssetId: asset._id, isShared: false });
  const notificationId = new ObjectId();
  await source.collection('notifications').insertOne({ _id: notificationId, userId: user._id, schoolId: school._id, title: 'Do not resend', emailState: 'PENDING' });
  await source.collection('jobs').insertMany([
    { _id: new ObjectId(), kind: 'NOTIFICATION_EMAIL', schoolId: school._id, resourceId: notificationId, status: 'QUEUED', maxAttempts: 5, attempts: 0, totalAttempts: 0, runAt: new Date() },
    { _id: new ObjectId(), kind: 'FILE_DELETE', schoolId: school._id, resourceId: new ObjectId(), status: 'SUCCEEDED', outcome: 'FILE_REMOVED', totalAttempts: 1, attempts: 1, maxAttempts: 5 },
  ]);
  await source.collection('authattempts').insertOne({ _id: 'throttle', count: 4, expiresAt: new Date(Date.now() + 600000) });
  await source.collection('authattempts').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await source.createCollection('typeddata', { validator: { $jsonSchema: { bsonType: 'object' } } });
  await source.collection('typeddata').insertOne({ _id: new ObjectId(), long: BSON.Long.fromString('9223372036854775806'), decimal: BSON.Decimal128.fromString('123.456789'), binary: new BSON.Binary(Buffer.from([0, 1, 255]), 128), timestamp: new BSON.Timestamp({ t: 42, i: 7 }), when: new Date('2026-09-06T00:00:00Z'), integer: new BSON.Int32(42), double: new BSON.Double(42) });
  await source.createCollection('emptycollection');
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect(); if (client) await client.close(); if (mongo) await mongo.stop();
  if (root) { assert.equal(path.dirname(root), path.resolve(os.tmpdir())); assert.ok(path.basename(root).startsWith('phase1-backup-')); await fs.rm(root, { recursive: true, force: true }); }
});
const options = () => ({ filename: path.join(root, `${randomUUID()}.edubak`), key, localRoot, stagingRoot, maintenance: true, jwtSecret: sourceJwt, mfaKey: process.env.AUTH_MFA_ENCRYPTION_KEY });
async function saved(extra = {}) { const settings = { ...options(), ...extra }; const report = await service.create(source, settings); return { ...settings, report }; }
function destination(snapshot, extra = {}) {
  const targetDatabase = `backup_target_${randomUUID().replaceAll('-', '')}`;
  return { ...snapshot, targetDatabase, localRoot: path.join(root, `restored-${randomUUID()}`), jwtSecret: targetJwt, apply: true, ...extra };
}

test('encrypted snapshot verifies all collections and files without exposing plaintext', async () => {
  const snapshot = await saved();
  assert.equal(snapshot.report.files, 1); assert.equal(snapshot.report.fileBytes, body.length);
  assert.equal(snapshot.report.collections.emptycollection, 0);
  const bytes = await fs.readFile(snapshot.filename);
  for (const secret of [user.email, user.password, mfa.secret, 'Private fixture content']) assert.equal(bytes.includes(Buffer.from(secret)), false);
  const report = await service.verify(snapshot);
  assert.equal(report.requiresMfaKey, true);
  assert.deepEqual(await fs.readdir(stagingRoot), []);
});

test('full restore preserves BSON types, indexes, validators, tenant IDs, file bytes and quota', async () => {
  const snapshot = await saved(), target = destination(snapshot), db = client.db(target.targetDatabase);
  const restored = await service.restore(db, target);
  assert.equal(restored.applied, true);
  const beforeDoc = await source.collection('typeddata').findOne({}, { promoteValues: false });
  const afterDoc = await db.collection('typeddata').findOne({}, { promoteValues: false });
  assert.deepEqual(BSON.serialize(afterDoc), BSON.serialize(beforeDoc));
  assert.equal((await db.listCollections({ name: 'typeddata' }).next()).options.validator.$jsonSchema.bsonType, 'object');
  assert.equal((await db.collection('users').listIndexes().toArray()).find(i => i.name === 'email_1').unique, true);
  await assert.rejects(db.collection('users').insertOne({ email: user.email }), e => e.code === 11000);
  const restoredAsset = await db.collection('fileassets').findOne({ _id: asset._id });
  assert.equal(String(restoredAsset.schoolId), String(school._id)); assert.equal(restoredAsset.driver, 'local');
  assert.deepEqual(await fs.readFile(path.join(target.localRoot, ...asset.key.split('/'))), body);
  assert.equal((await db.collection('schools').findOne({ _id: school._id })).storageUsedBytes, body.length);
  await assertUsable(db, { jwtSecret: targetJwt });
});

test('restore requires a new JWT key and preserves MFA while invalidating challenges and suppressing outgoing work', async () => {
  const snapshot = await saved(), target = destination(snapshot), db = client.db(target.targetDatabase);
  await assert.rejects(service.restore(db, { ...target, jwtSecret: sourceJwt }), e => e.code === 'ROTATED_JWT_SECRET_REQUIRED');
  await assert.rejects(service.restore(db, { ...target, mfaKey: 'ef'.repeat(32) }), e => e.code === 'MFA_KEY_MISMATCH');
  await service.restore(db, target);
  const restored = await db.collection('users').findOne({ _id: user._id });
  assert.equal(restored.security.mfaEnabled, true); assert.equal(restored.security.secret, user.security.secret);
  assert.deepEqual(restored.security.recoveryHashes, []);
  assert.ok(restored.security.lastCounter >= Math.floor(Date.now() / 30000) - 1);
  assert.equal(restored.security.challenge, null); assert.equal(restored.security.setup, null);
  assert.equal(restored.security.sessionVersion, 4); assert.equal(restored.security.revision, 8);
  assert.equal(await db.collection('authattempts').countDocuments(), 0);
  assert.equal((await db.collection('jobs').findOne({ kind: 'NOTIFICATION_EMAIL' })).status, 'CANCELLED');
  assert.equal((await db.collection('jobs').findOne({ kind: 'FILE_DELETE' })).status, 'SUCCEEDED');
  assert.equal((await db.collection('notifications').findOne({})).emailState, 'NOT_REQUESTED');
  assert.equal((await source.collection('jobs').findOne({ kind: 'NOTIFICATION_EMAIL' })).status, 'QUEUED');
});

test('dry run changes neither database nor target storage', async () => {
  const snapshot = await saved(), target = destination(snapshot, { apply: false }), db = client.db(target.targetDatabase);
  assert.equal((await service.restore(db, target)).applied, false);
  assert.equal((await db.listCollections().toArray()).length, 0);
  await assert.rejects(fs.stat(target.localRoot), e => e.code === 'ENOENT');
});

test('nonempty target, original database and existing directory are rejected without modifying contents', async () => {
  const snapshot = await saved(), target = destination(snapshot), db = client.db(target.targetDatabase);
  await db.collection('existing').insertOne({ _id: 'keep', value: 'untouched' });
  await assert.rejects(service.restore(db, target), e => e.code === 'TARGET_DATABASE_NOT_EMPTY');
  assert.equal((await db.collection('existing').findOne({ _id: 'keep' })).value, 'untouched');
  await assert.rejects(service.restore(source, { ...target, targetDatabase: source.databaseName }), e => e.code === 'NEW_TARGET_DATABASE_REQUIRED');
  const other = destination(snapshot); await fs.mkdir(other.localRoot);
  await assert.rejects(service.restore(client.db(other.targetDatabase), other), e => e.code === 'NEW_STORAGE_ROOT_REQUIRED');
});

test('tampering, truncation, wrong key and oversize reject before any destination write; stage is cleaned', async () => {
  const snapshot = await saved(), original = await fs.readFile(snapshot.filename);
  for (const bytes of [original.subarray(0, -1), Buffer.from(original)]) {
    if (bytes.length === original.length) bytes[40] ^= 1;
    const filename = path.join(root, `${randomUUID()}.edubak`); await fs.writeFile(filename, bytes);
    const target = destination({ ...snapshot, filename }), db = client.db(target.targetDatabase);
    await assert.rejects(service.restore(db, target));
    assert.equal((await db.listCollections().toArray()).length, 0);
    await assert.rejects(fs.stat(target.localRoot), e => e.code === 'ENOENT');
  }
  await assert.rejects(service.verify({ ...snapshot, key: 'ef'.repeat(32) }), e => e.code === 'ARCHIVE_AUTHENTICATION_FAILED');
  await assert.rejects(service.verify({ ...snapshot, maxBytes: 100 }), e => e.code === 'INVALID_ARCHIVE_SIZE');
  assert.deepEqual(await fs.readdir(stagingRoot), []);
});

test('missing, changed or tenant-mismatched files fail backup without publishing an archive', async () => {
  const settings = options();
  await fs.writeFile(path.join(localRoot, ...asset.key.split('/')), Buffer.from('changed'));
  await assert.rejects(service.create(source, settings), e => e.code === 'FILE_CHECKSUM_MISMATCH');
  await assert.rejects(fs.stat(settings.filename), e => e.code === 'ENOENT');
  await fs.unlink(path.join(localRoot, ...asset.key.split('/')));
  await assert.rejects(service.create(source, settings), e => e.code === 'ENOENT');
  await source.collection('fileassets').updateOne({ _id: asset._id }, { $set: { key: `../${randomUUID()}` } });
  await assert.rejects(service.create(source, settings), e => e.code === 'INVALID_FILE_ASSET');
});

test('maintenance, settled file operations and reviewed running jobs are mandatory', async () => {
  await assert.rejects(service.create(source, { ...options(), maintenance: false }), e => e.code === 'MAINTENANCE_REQUIRED');
  await source.collection('fileassets').updateOne({ _id: asset._id }, { $set: { status: 'UPLOADING' } });
  await assert.rejects(service.create(source, options()), e => e.code === 'UNFINISHED_FILE_OPERATIONS');
  await source.collection('fileassets').updateOne({ _id: asset._id }, { $set: { status: 'READY' } });
  await source.collection('jobs').updateOne({ kind: 'NOTIFICATION_EMAIL' }, { $set: { status: 'RUNNING' } });
  await assert.rejects(service.create(source, options()), e => e.code === 'RUNNING_JOBS_REQUIRE_REVIEW');
});

test('quota drift and unsupported collection types/options are refused explicitly', async () => {
  await source.collection('schools').updateOne({ _id: school._id }, { $set: { storageUsedBytes: 1 } });
  const settings = options();
  await assert.rejects(service.create(source, settings), e => e.code === 'STORAGE_QUOTA_MISMATCH');
  await assert.rejects(fs.stat(settings.filename), e => e.code === 'ENOENT');
  await source.createCollection('viewofusers', { viewOn: 'users', pipeline: [] });
  await assert.rejects(service.create(source, options()), e => e.code === 'UNSUPPORTED_COLLECTION');
});

test('S3 reader adapter supplies bytes; restore changes storage metadata to isolated local files', async () => {
  await source.collection('fileassets').updateOne({ _id: asset._id }, { $set: { driver: 's3', bucket: 'fixture-only-bucket' } });
  let reads = 0;
  const snapshot = await saved({ readAsset: async item => { reads++; assert.equal(item.bucket, 'fixture-only-bucket'); return Readable.from([body]); } });
  assert.equal(reads, 1);
  const target = destination(snapshot), db = client.db(target.targetDatabase);
  await service.restore(db, target);
  assert.equal((await db.collection('fileassets').findOne({ _id: asset._id })).bucket, '');
  assert.deepEqual(await fs.readFile(path.join(target.localRoot, ...asset.key.split('/'))), body);
});

test('an existing backup file is never overwritten and partial artifacts are removed', async () => {
  const snapshot = await saved(), original = await fs.readFile(snapshot.filename);
  await assert.rejects(service.create(source, snapshot), e => e.code === 'EEXIST');
  assert.deepEqual(await fs.readFile(snapshot.filename), original);
  assert.equal((await fs.readdir(root)).some(name => name.includes('.partial-') || name.includes('.checking-')), false);
});

test('authenticated malformed payload cannot traverse paths or omit file content', async () => {
  const snapshot = await saved();
  const records = await archive.withVerifiedPayload(snapshot.filename, key, stagingRoot, async payload => {
    const rows = []; for await (const row of archive.readRecords(payload)) rows.push(row); return rows;
  });
  const fileIndex = records.findIndex(r => r.kind === 'file');
  for (const malformed of [records.slice(0, fileIndex).concat({ kind: 'end' }), records.concat({ kind: 'end' }), [{ ...records[0], collections: [{ name: '../escape', options: {}, indexes: [] }] }, ...records.slice(1)]]) {
    const filename = path.join(root, `${randomUUID()}.edubak`);
    await archive.writeArchive(filename, Readable.from(malformed), key);
    const target = destination({ ...snapshot, filename }), db = client.db(target.targetDatabase);
    await assert.rejects(service.restore(db, target));
    assert.equal((await db.listCollections().toArray()).length, 0);
  }
});

test('failure after target claim leaves a guard; another restore and application startup reject it', async () => {
  const snapshot = await saved(), target = destination(snapshot), db = client.db(target.targetDatabase);
  const failingDb = { databaseName: db.databaseName, listCollections: (...args) => db.listCollections(...args), collection: (...args) => db.collection(...args),
    createCollection: async (name, ...args) => { if (name === 'users') throw new Error('simulated disk/database failure'); return db.createCollection(name, ...args); } };
  await assert.rejects(service.restore(failingDb, target), /simulated/);
  assert.equal((await db.collection('restoreguard').findOne({ _id: 'restore' })).status, 'FAILED');
  await assert.rejects(assertUsable(db), e => e.code === 'RESTORE_INCOMPLETE');
  await assert.rejects(service.restore(db, { ...target, localRoot: path.join(root, `other-${randomUUID()}`) }), e => e.code === 'TARGET_DATABASE_NOT_EMPTY');
  assert.equal(await source.collection('users').countDocuments(), 1);
});

test('concurrent restores to one empty target have one winner', async () => {
  const snapshot = await saved(), target = destination(snapshot), db = client.db(target.targetDatabase);
  const results = await Promise.allSettled([service.restore(db, target), service.restore(db, { ...target, localRoot: path.join(root, `parallel-${randomUUID()}`) })]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(await db.collection('users').countDocuments(), 1);
  await assertUsable(db, { jwtSecret: targetJwt });
});

test('restored application rejects old JWT/recovery codes, supports TOTP login and downloads exact file bytes', async () => {
  const snapshot = await saved(), target = destination(snapshot), db = client.db(target.targetDatabase);
  await service.restore(db, target);
  process.env.JWT_SECRET = targetJwt; process.env.FILE_LOCAL_ROOT = target.localRoot; process.env.FILE_STORAGE_DRIVER = 'local';
  const app = require('../src/app');
  process.env.MONGO_DB_URL = mongo.getUri(target.targetDatabase);
  await require('../src/config/database')();
  await require('../src/services/rolePermissionCache').reload();
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}/v1/api`;
  const get = (url, token) => fetch(`${origin}${url}`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal((await get('/auth/me', jwt.sign({ _id: user._id, sessionVersion: 4 }, sourceJwt))).status, 401);
  const challenge = await require('../src/services/authService').login(user.email, 'A private fixture phrase!');
  assert.equal(challenge.mfaRequired, true);
  const security = require('../src/services/authSecurityService');
  await assert.rejects(security.verifyLogin({ ...challenge, code: '12'.repeat(16) }), e => e.statusCode === 400);
  const code = new (require('otpauth').TOTP)({ secret: mfa.secret }).generate({ timestamp: Date.now() + 30000 });
  const session = await security.verifyLogin({ ...challenge, code });
  assert.equal((await get('/auth/me', session.access_token)).status, 200);
  const download = await get(`/files/${asset._id}/download`, session.access_token);
  assert.equal(download.status, 200); assert.deepEqual(Buffer.from(await download.arrayBuffer()), body);
  assert.equal(await require('../src/services/jobService').claim(), null);
});

test('CLI verifies a real encrypted backup, refuses missing maintenance and hides connection secrets', async () => {
  const snapshot = await saved();
  const execute = promisify(execFile), script = path.resolve(__dirname, '../scripts/backup.js');
  const env = { ...process.env, BACKUP_ENCRYPTION_KEY: key, BACKUP_STAGING_ROOT: stagingRoot, BACKUP_MAX_BYTES: '10485760', RESTORE_DB_URL: '', MONGO_DB_URL: '' };
  const result = await execute(process.execPath, [script, 'verify', '--file', snapshot.filename], { env });
  assert.equal(JSON.parse(result.stdout).files, 1); assert.equal(result.stdout.includes(key), false);
  await assert.rejects(execute(process.execPath, [script, 'create', '--file', path.join(root, 'never-created.edubak')], { env }), e => e.stderr.includes('MAINTENANCE_REQUIRED'));
  env.MONGO_DB_URL = 'mongodb://private-user:secret-password@bad host/backup_source';
  await assert.rejects(execute(process.execPath, [script, 'create', '--file', path.join(root, 'never-created.edubak'), '--maintenance'], { env }), e => !e.stderr.includes('private-user') && !e.stderr.includes('secret-password') && e.stderr.includes('BACKUP_OPERATION_FAILED'));
});

test('completed target enforces runtime key configuration and can itself be backed up again', async () => {
  const snapshot = await saved(), target = destination(snapshot), db = client.db(target.targetDatabase);
  await service.restore(db, target);
  await assert.rejects(assertUsable(db, { jwtSecret: sourceJwt }), e => e.code === 'RESTORE_JWT_CONFIG_MISMATCH');
  await assert.rejects(assertUsable(db, { jwtSecret: targetJwt, mfaKey: 'ef'.repeat(32) }), e => e.code === 'RESTORE_MFA_CONFIG_MISMATCH');
  await assertUsable(db, { jwtSecret: targetJwt });
  const nextBackup = await service.create(db, { ...target, filename: path.join(root, `${randomUUID()}.edubak`) });
  assert.equal(nextBackup.files, 1); assert.equal(nextBackup.collections.restoreguard, undefined);
  assert.equal((await db.collection('restoreguard').findOne({ _id: 'restore' })).status, 'COMPLETE');
});

test('symlink archive/storage paths and backup locations inside private storage are refused', async () => {
  const settings = options(), link = path.join(root, `junction-${randomUUID()}`);
  await fs.symlink(localRoot, link, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(service.create(source, { ...settings, localRoot: link }), e => e.code === 'SYMLINK_NOT_ALLOWED');
  await assert.rejects(service.create(source, { ...settings, filename: path.join(localRoot, 'not-allowed.edubak') }), e => e.code === 'BACKUP_INSIDE_FILE_STORAGE');
  await fs.unlink(link);
});

test('CLI creates, plans and applies a restore against isolated databases with explicit options', async () => {
  const settings = options(), execute = promisify(execFile), script = path.resolve(__dirname, '../scripts/backup.js');
  const target = destination(settings);
  const env = { ...process.env, BACKUP_ENCRYPTION_KEY: key, BACKUP_STAGING_ROOT: stagingRoot, BACKUP_MAX_BYTES: '10485760',
    MONGO_DB_URL: mongo.getUri('backup_source'), JWT_SECRET: sourceJwt, FILE_LOCAL_ROOT: localRoot,
    RESTORE_DB_URL: mongo.getUri(), RESTORE_JWT_SECRET: targetJwt, RESTORE_MFA_ENCRYPTION_KEY: process.env.AUTH_MFA_ENCRYPTION_KEY };
  const created = await execute(process.execPath, [script, 'create', '--file', settings.filename, '--maintenance'], { env });
  assert.equal(JSON.parse(created.stdout).files, 1);
  const args = [script, 'restore', '--file', settings.filename, '--maintenance', '--target-db', target.targetDatabase, '--storage-root', target.localRoot];
  const plan = await execute(process.execPath, args, { env });
  assert.equal(JSON.parse(plan.stdout).applied, false);
  const applied = await execute(process.execPath, [...args, '--apply'], { env });
  assert.equal(JSON.parse(applied.stdout).applied, true);
  assert.deepEqual(await fs.readFile(path.join(target.localRoot, ...asset.key.split('/'))), body);
  await assertUsable(client.db(target.targetDatabase), { jwtSecret: targetJwt });
});

test('API and worker startup reject incomplete restore before Mongoose auto-creates collections', async () => {
  const name = `backup_target_${randomUUID().replaceAll('-', '')}`, db = client.db(name);
  await db.collection('restoreguard').insertOne({ _id: 'restore', status: 'FAILED' });
  const execute = promisify(execFile);
  const env = { ...process.env, MONGO_DB_URL: mongo.getUri(name), PORT: '0' };
  for (const script of ['../src/server.js', '../scripts/job-worker.js']) {
    await assert.rejects(execute(process.execPath, [path.resolve(__dirname, script)], { env }), e => e.code === 1 && e.stderr.includes('BackupError'));
  }
  assert.deepEqual((await db.listCollections().toArray()).map(c => c.name), ['restoreguard']);
});
