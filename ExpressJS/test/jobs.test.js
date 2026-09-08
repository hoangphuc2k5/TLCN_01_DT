const { test, before, beforeEach, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const { setTimeout: delay } = require('node:timers/promises');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: 'isolated-job-tests', GMAIL_USER: '', GMAIL_APP_PASSWORD: '', AUTH_GMAIL_ONLY: 'false', FILE_STORAGE_DRIVER: 'local', JOB_MAX_ATTEMPTS: '2', JOB_RETRY_MS: '100', JOB_LEASE_MS: '1000', JOB_FILE_DELETE_GRACE_MS: '0' });
const app = require('../src/app');
const Job = require('../src/models/Job');
const Notification = require('../src/models/Notification');
const School = require('../src/models/School');
const Role = require('../src/models/Role');
const User = require('../src/models/User');
const FileAsset = require('../src/models/FileAsset');
const Material = require('../src/models/LearningMaterial');
const jobs = require('../src/services/jobService');
const worker = require('../src/jobs/worker');
const handlers = require('../src/jobs/handlers');
const mail = require('../src/services/mailService');
const storage = require('../src/services/fileStorage');
const id = () => new mongoose.Types.ObjectId();
let mongo, root, server, origin, schools, actors;
before(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'phase1-jobs-'));
  process.env.FILE_LOCAL_ROOT = root;
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { downloadDir: path.resolve(__dirname, '../node_modules/.cache/mongodb-memory-server') } });
  await mongoose.connect(mongo.getUri());
  await Role.create([
    { code: 'SCHOOL_ADMIN', name: 'Admin', permissions: [{ resource: 'jobs', actions: ['view', 'execute'] }] },
    { code: 'CLUSTER_ADMIN', name: 'Cluster', permissions: [{ resource: 'jobs', actions: ['view', 'execute'] }] },
    { code: 'JOB_VIEWER', name: 'Viewer', permissions: [{ resource: 'jobs', actions: ['view'] }] },
    { code: 'STUDENT', name: 'Student', permissions: [] },
  ]);
  await require('../src/services/rolePermissionCache').reload();
  const cluster = id();
  schools = await School.create([0, 1, 2].map(i => ({ name: `Job school ${i}`, code: `JB${i}`, subdomain: `jb${i}`, clusterId: i < 2 ? cluster : id() })));
  actors = {};
  for (const [name, role] of Object.entries({ admin: 'SCHOOL_ADMIN', cluster: 'CLUSTER_ADMIN', viewer: 'JOB_VIEWER', student: 'STUDENT' })) {
    actors[name] = await User.create({ name, email: `${name}@jobs.test`, role, schoolId: name === 'cluster' ? null : schools[0]._id, clusterId: cluster });
  }
  await Promise.all([Job.init(), Notification.init(), FileAsset.init(), Material.init()]);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}/v1/api`;
});
beforeEach(async () => { await Job.deleteMany({}); await Notification.deleteMany({}); });
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  if (root) { assert.equal(path.dirname(root), path.resolve(os.tmpdir())); assert.ok(path.basename(root).startsWith('phase1-jobs-')); await fs.rm(root, { recursive: true, force: true }); }
});
const enqueue = (overrides = {}) => jobs.enqueue({ schoolId: schools[0]._id, kind: 'NOTIFICATION_EMAIL', resourceId: id(), ...overrides });
const note = (overrides = {}) => Notification.create({ schoolId: schools[0]._id, userId: actors.student._id, title: 'Job notice', message: 'Test content', emailState: 'PENDING', ...overrides });
const request = (url, actor = actors.admin, data) => fetch(`${origin}${url}`, { method: data === undefined ? 'GET' : 'POST',
  headers: { Authorization: `Bearer ${jwt.sign({ _id: actor._id }, process.env.JWT_SECRET)}`, 'Content-Type': 'application/json' }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });

test('concurrent enqueue deduplicates per tenant, kind and resource; completed jobs stay deduplicated', async () => {
  const resourceId = id();
  const results = await Promise.all(Array.from({ length: 8 }, () => enqueue({ resourceId })));
  assert.equal(new Set(results.map(j => String(j._id))).size, 1);
  assert.equal(await Job.countDocuments(), 1);
  const job = await jobs.claim();
  await jobs.complete(job);
  assert.equal((await enqueue({ resourceId })).status, 'SUCCEEDED');
  await enqueue({ resourceId, schoolId: schools[1]._id });
  assert.equal(await Job.countDocuments(), 2);
});

test('scheduled jobs are not claimed early and two workers cannot claim the same live lease', async () => {
  const future = new Date(Date.now() + 60000);
  await enqueue({ runAt: future });
  assert.equal(await jobs.claim(), null);
  const results = await Promise.all([jobs.claim(future), jobs.claim(future)]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(results.find(Boolean).attempts, 1);
});

test('expired lease is reclaimed and the old worker cannot acknowledge or extend it', async () => {
  await enqueue();
  const old = await jobs.claim();
  const future = new Date(old.lockedUntil.getTime() + 1);
  const current = await jobs.claim(future);
  assert.notEqual(current.lockToken, old.lockToken);
  assert.equal(current.attempts, 2);
  assert.equal(await jobs.complete(old, {}, future), false);
  assert.equal(await jobs.heartbeat(old, future), false);
  assert.equal(await jobs.fail(old, new Error('old'), future), false);
  assert.equal(await jobs.complete(current, {}, future), true);
});

test('a crash on the last attempt becomes FAILED instead of being stuck RUNNING', async () => {
  const queued = await enqueue();
  await Job.updateOne({ _id: queued._id }, { maxAttempts: 1 });
  const job = await jobs.claim();
  assert.equal(await jobs.claim(new Date(job.lockedUntil.getTime() + 1)), null);
  assert.equal((await Job.findById(job._id)).status, 'FAILED');
});

test('retry uses backoff, stops at maxAttempts and never persists raw exception secrets', async () => {
  const queued = await enqueue();
  const first = await jobs.claim();
  const now = new Date();
  await jobs.fail(first, new Error('password=private-value'), now);
  const pending = await Job.findById(queued._id);
  assert.equal(pending.status, 'QUEUED');
  assert.equal(pending.runAt.getTime(), now.getTime() + 100);
  assert.equal(pending.lastError, 'JOB_EXECUTION_FAILED');
  assert.equal(await jobs.claim(now), null);
  const second = await jobs.claim(pending.runAt);
  await jobs.fail(second, { code: 'SMTP_SEND_FAILED' }, pending.runAt);
  assert.equal((await Job.findById(queued._id)).status, 'FAILED');
});

test('heartbeat keeps a slow handler owned until completion', async () => {
  const queued = await enqueue();
  await worker.runOnce({ handlers: { NOTIFICATION_EMAIL: async () => { await delay(1350); return { outcome: 'TEST_DONE' }; } } });
  const job = await Job.findById(queued._id);
  assert.equal(job.status, 'SUCCEEDED');
  assert.equal(job.attempts, 1);
});

test('dispatcher resumes persisted notification intent and recovers crash between enqueue and marking', async () => {
  const notification = await note({ emailRunAt: new Date(Date.now() + 60000) });
  await jobs.dispatch();
  await Notification.updateOne({ _id: notification._id }, { emailState: 'PENDING' });
  await Promise.all([jobs.dispatch(), jobs.dispatch()]);
  assert.equal(await Job.countDocuments(), 1);
  assert.equal((await Notification.findById(notification._id).select('+emailState')).emailState, 'ENQUEUED');
  assert.equal(await jobs.claim(), null);
});

test('legacy notifications without email intent are never retroactively sent', async () => {
  await note({ emailState: 'NOT_REQUESTED' });
  await Notification.collection.insertOne({ userId: actors.student._id, title: 'Legacy', message: 'Old' });
  await jobs.dispatch();
  assert.equal(await Job.countDocuments(), 0);
});

test('email handler performs delivery through the mail service with a stable message ID', async () => {
  await note();
  await jobs.dispatch();
  const sent = [];
  const replacement = mock.method(mail, 'notifyUserByEmail', async (user, body) => { sent.push({ user, body }); return { skipped: false }; });
  try {
    await worker.runOnce();
    assert.equal(sent.length, 1);
    assert.equal(sent[0].body.message, 'Test content');
    const job = await Job.findOne();
    assert.equal(sent[0].body.messageId, `<job-${job._id}@school-ms.local>`);
    assert.equal(job.status, 'SUCCEEDED');
    assert.equal(await worker.runOnce(), false);
  } finally { replacement.mock.restore(); }
});

test('missing SMTP config retries rather than reporting email delivery success', async () => {
  await note();
  await jobs.dispatch();
  await worker.runOnce();
  const job = await Job.findOne();
  assert.equal(job.status, 'QUEUED');
  assert.equal(job.lastError, 'SMTP_UNCONFIGURED');
});

test('a moved or disabled recipient is skipped before any mail is sent', async () => {
  const notification = await note({ schoolId: schools[1]._id });
  const job = await enqueue({ resourceId: notification._id, schoolId: schools[1]._id });
  assert.equal((await handlers.NOTIFICATION_EMAIL(job)).outcome, 'RECIPIENT_SCOPE_CHANGED');
  await User.updateOne({ _id: actors.student._id }, { status: 'INACTIVE' });
  try { assert.equal((await handlers.NOTIFICATION_EMAIL(job)).outcome, 'RECIPIENT_INACTIVE'); }
  finally { await User.updateOne({ _id: actors.student._id }, { status: 'ACTIVE' }); }
});

test('message API persists email schedule without sending mail in the request', async () => {
  const scheduled = new Date(Date.now() + 60000).toISOString();
  const replacement = mock.method(mail, 'notifyUserByEmail', async () => { throw new Error('Must not send in API'); });
  try {
    const response = await request('/messages', actors.admin, { receiverId: actors.student._id, body: 'Queued message', emailRunAt: scheduled });
    assert.equal(response.status, 201);
    assert.equal(replacement.mock.callCount(), 0);
    const notification = await Notification.findOne({ type: 'MESSAGE' }).select('+emailState +emailRunAt');
    assert.equal(notification.emailState, 'PENDING');
    assert.equal(notification.emailRunAt.toISOString(), scheduled);
    await jobs.dispatch();
    assert.equal(await Job.countDocuments(), 1);
    assert.equal((await request('/messages', actors.admin, { receiverId: actors.student._id, body: 'Invalid', emailRunAt: 'bad' })).status, 400);
  } finally { replacement.mock.restore(); }
});

test('file cleanup job removes real bytes and releases reserved quota; active uploads are ignored', async () => {
  const asset = await FileAsset.create({ schoolId: schools[0]._id, uploadedBy: actors.admin._id, originalName: 'cleanup.txt', mimeType: 'text/plain', sizeBytes: 3, sha256: 'test-hash', driver: 'local', key: `${schools[0]._id}/${randomUUID()}`, status: 'DELETING' });
  await storage.adapter('local').put({ ...asset.toObject(), buffer: Buffer.from('abc') });
  await School.updateOne({ _id: schools[0]._id }, { storageUsedBytes: 3 });
  await Material.create({ schoolId: schools[0]._id, uploadedBy: actors.admin._id, title: 'Cleanup material', fileAssetId: asset._id });
  const active = await FileAsset.create({ ...asset.toObject(), _id: id(), key: `${schools[0]._id}/${randomUUID()}`, status: 'UPLOADING' });
  await jobs.dispatch();
  assert.equal(await Job.countDocuments(), 1);
  await worker.runOnce();
  assert.equal((await Job.findOne()).status, 'SUCCEEDED');
  assert.equal((await School.findById(schools[0]._id).select('+storageUsedBytes')).storageUsedBytes, 0);
  await assert.rejects(fs.stat(storage.localPath(asset.key)), { code: 'ENOENT' });
  assert.ok(await FileAsset.exists({ _id: active._id }));
  await active.deleteOne();
});

test('operators only see their school or cluster jobs and view-only roles cannot mutate', async () => {
  const own = await enqueue();
  const foreign = await enqueue({ schoolId: schools[2]._id });
  await enqueue({ schoolId: schools[1]._id });
  for (const [actor, expected] of [[actors.admin, 1], [actors.cluster, 2], [actors.viewer, 1]]) {
    const response = await request('/jobs', actor);
    assert.equal(response.status, 200);
    const data = (await response.json()).data;
    assert.equal(data.total, expected);
    assert.ok(data.items.every(j => j.lockToken === undefined));
  }
  assert.equal((await request('/jobs', actors.student)).status, 403);
  assert.equal((await request(`/jobs/${own._id}/cancel`, actors.viewer, {})).status, 403);
  assert.equal((await request(`/jobs/${foreign._id}/cancel`, actors.admin, {})).status, 404);
  assert.equal((await request('/jobs?status=BAD')).status, 400);
});

test('operator cancel/retry is state guarded and can schedule a failed job for later', async () => {
  const job = await enqueue();
  assert.equal((await request(`/jobs/${job._id}/cancel`, actors.admin, {})).status, 200);
  const future = new Date(Date.now() + 60000).toISOString();
  assert.equal((await request(`/jobs/${job._id}/retry`, actors.admin, { runAt: 'bad' })).status, 400);
  assert.equal((await request(`/jobs/${job._id}/retry`, actors.admin, { runAt: future })).status, 200);
  assert.equal(await jobs.claim(), null);
  assert.equal((await request(`/jobs/${job._id}/retry`, actors.admin, {})).status, 409);
  await jobs.claim(new Date(future));
  assert.equal((await request(`/jobs/${job._id}/cancel`, actors.admin, {})).status, 409);
});

test('queued mail preserves message ID and escapes user content without contacting SMTP', async () => {
  const nodemailer = require('nodemailer');
  const messages = [];
  const replacement = mock.method(nodemailer, 'createTransport', () => ({ sendMail: async options => { messages.push(options); return { messageId: options.messageId }; } }));
  Object.assign(process.env, { GMAIL_USER: 'fixture@gmail.com', GMAIL_APP_PASSWORD: 'fixture-only' });
  try {
    const result = await mail.notifyUserByEmail({ email: 'recipient@jobs.test' }, { title: '<script>x</script>', message: 'A & B', messageId: '<fixture@jobs.test>' });
    assert.equal(result.skipped, false);
    assert.equal(messages[0].messageId, '<fixture@jobs.test>');
    assert.ok(messages[0].html.includes('&lt;script&gt;'));
    assert.ok(messages[0].html.includes('A &amp; B'));
    assert.ok(!messages[0].html.includes('<script>'));
  } finally {
    mail.closeTransporter();
    replacement.mock.restore();
    Object.assign(process.env, { GMAIL_USER: '', GMAIL_APP_PASSWORD: '' });
  }
});

test('worker stopping during dispatch does not claim another job', async () => {
  const job = await enqueue();
  const controller = new AbortController();
  const replacement = mock.method(jobs, 'dispatch', async () => controller.abort());
  try {
    await worker.run({ signal: controller.signal });
    assert.equal((await Job.findById(job._id)).status, 'QUEUED');
  } finally { replacement.mock.restore(); }
});
