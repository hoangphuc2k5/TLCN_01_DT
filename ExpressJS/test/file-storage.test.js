const { test, before, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { Readable } = require('node:stream');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: 'file-storage-isolated-test', FILE_STORAGE_DRIVER: 'local', FILE_DEFAULT_QUOTA_BYTES: '1000000', FILE_MAX_BYTES: '100000' });
const app = require('../src/app');
const School = require('../src/models/School');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const Class = require('../src/models/Class');
const Year = require('../src/models/AcademicYear');
const Subject = require('../src/models/Subject');
const Assignment = require('../src/models/TeacherAssignment');
const FileAsset = require('../src/models/FileAsset');
const Material = require('../src/models/LearningMaterial');
const Subscription = require('../src/models/Subscription');
const storage = require('../src/services/fileStorage');
const { ROLE_PERMISSIONS } = require('../src/constants/permissions');
const { legacyPermissionsToEntries } = require('../src/constants/permissionCatalog');
let mongo, server, origin, root, schools, classes, actors;
const pdf = Buffer.from('%PDF-1.4\nTest school file\n%%EOF');

before(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'phase1-files-'));
  process.env.FILE_LOCAL_ROOT = root;
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { downloadDir: path.resolve(__dirname, '../node_modules/.cache/mongodb-memory-server') } });
  await mongoose.connect(mongo.getUri());
  await Role.create(Object.entries(ROLE_PERMISSIONS).map(([code, keys]) => ({ code, name: code, permissions: legacyPermissionsToEntries(keys) })));
  await Role.create({ code: 'FILE_READER_DENIED', name: 'No file rights', permissions: [{ resource: 'reports', actions: ['view'] }] });
  await require('../src/services/rolePermissionCache').reload();
  schools = await School.create([0, 1].map(i => ({ name: `Storage school ${i}`, code: `FS${i}`, subdomain: `fs${i}` })));
  const year = await Year.create({ schoolId: schools[0]._id, name: '2026', startDate: '2026-01-01', endDate: '2026-12-31' });
  classes = await Class.create([0, 1].map(i => ({ schoolId: schools[0]._id, name: `Storage class ${i}`, academicYearId: year._id, gradeLevel: 10 })));
  const subject = await Subject.create({ schoolId: schools[0]._id, name: 'Math', code: 'MATH' });
  actors = {};
  for (const [name, role] of Object.entries({ teacher: 'SUBJECT_TEACHER', peer: 'SUBJECT_TEACHER', admin: 'SCHOOL_ADMIN', foreign: 'SCHOOL_ADMIN', student: 'STUDENT', parent: 'PARENT', outsider: 'STUDENT', denied: 'FILE_READER_DENIED' })) {
    actors[name] = await User.create({ name, email: `${name}@storage.test`, role, schoolId: schools[name === 'foreign' ? 1 : 0]._id,
      classId: name === 'student' ? classes[0]._id : name === 'outsider' ? classes[1]._id : null });
  }
  await User.updateOne({ _id: actors.parent._id }, { parentOf: [actors.student._id] });
  await Assignment.create({ schoolId: schools[0]._id, classId: classes[0]._id, teacherId: actors.teacher._id, subjectId: subject._id, academicYearId: year._id });
  await Promise.all([FileAsset.init(), Material.init(), School.init(), Subscription.init()]);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}/v1/api`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  if (root) {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('phase1-files-'));
    await fs.rm(root, { recursive: true, force: true });
  }
});
const request = (url, actor = actors.teacher, options = {}) => fetch(`${origin}${url}`, { ...options, headers: { ...options.headers, Authorization: `Bearer ${jwt.sign({ _id: actor._id }, process.env.JWT_SECRET)}` } });
const upload = (actor = actors.teacher, data = {}, bytes = pdf, filename = 'lesson.pdf', mime = 'application/pdf') => {
  const body = new FormData();
  body.set('title', 'Uploaded lesson');
  for (const [key, value] of Object.entries(data)) body.set(key, String(value));
  if (bytes !== null) body.set('file', new Blob([bytes], { type: mime }), filename);
  return request('/materials/upload', actor, { method: 'POST', body });
};
const create = async (data = {}) => {
  const response = await upload(actors.teacher, data);
  assert.equal(response.status, 201, await response.clone().text());
  return (await response.json()).data;
};
const remove = material => request(`/materials/${material._id}`, actors.teacher, { method: 'DELETE' });
const used = async () => (await School.findById(schools[0]._id).select('+storageUsedBytes')).storageUsedBytes;

test('local upload stores private bytes and authenticated download returns exact content', async () => {
  const material = await create();
  const asset = await FileAsset.findById(material.fileAssetId);
  assert.equal(asset.status, 'READY');
  assert.equal(await used(), pdf.length);
  assert.deepEqual(await fs.readFile(storage.localPath(asset.key)), pdf);
  const response = await request(`/files/${asset._id}/download`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.match(response.headers.get('content-disposition'), /attachment/);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf);
  const meta = (await (await request(`/files/${asset._id}`)).json()).data;
  assert.equal(meta.sizeBytes, pdf.length);
  for (const field of ['key', 'bucket', 'driver']) assert.equal(meta[field], undefined);
  assert.equal((await fetch(`${origin}/files/${asset._id}/download`)).status, 401);
  assert.equal((await remove(material)).status, 200);
  assert.equal(await used(), 0);
  assert.equal((await request(`/files/${asset._id}/download`)).status, 404);
  await assert.rejects(fs.stat(storage.localPath(asset.key)), { code: 'ENOENT' });
});

test('download and metadata enforce tenant, class, parent linkage and active view permission', async () => {
  const material = await create({ classId: classes[0]._id });
  for (const endpoint of ['', '/download']) {
    for (const actor of [actors.student, actors.parent]) assert.equal((await request(`/files/${material.fileAssetId}${endpoint}`, actor)).status, 200);
    for (const actor of [actors.foreign, actors.outsider]) assert.equal((await request(`/files/${material.fileAssetId}${endpoint}`, actor)).status, 404);
    assert.equal((await request(`/files/${material.fileAssetId}${endpoint}`, actors.denied)).status, 403);
  }
  assert.equal((await request(`/materials/${material._id}`, actors.foreign, { method: 'DELETE' })).status, 404);
  await remove(material);
});

test('Vietnamese filenames and UTF-8 text round trip correctly', async () => {
  const bytes = Buffer.from('Bài học tiếng Việt');
  const response = await upload(actors.teacher, {}, bytes, 'bài học.txt', 'text/plain');
  assert.equal(response.status, 201);
  const material = (await response.json()).data;
  const meta = (await (await request(`/files/${material.fileAssetId}`)).json()).data;
  assert.equal(meta.originalName, 'bài học.txt');
  assert.deepEqual(Buffer.from(await (await request(`/files/${material.fileAssetId}/download`)).arrayBuffer()), bytes);
  await remove(material);
});

test('unshared upload remains private and another teacher cannot delete it', async () => {
  const material = await create({ isShared: false });
  for (const actor of [actors.parent, actors.peer]) assert.equal((await request(`/files/${material.fileAssetId}/download`, actor)).status, 404);
  assert.equal((await request(`/files/${material.fileAssetId}/download`, actors.admin)).status, 200);
  assert.equal((await request(`/materials/${material._id}`, actors.peer, { method: 'DELETE' })).status, 403);
  await remove(material);
});

test('invalid, oversized and unauthorized uploads create no asset or reservation', async () => {
  const initial = await used();
  const count = await FileAsset.countDocuments();
  assert.equal((await upload(actors.denied)).status, 403);
  assert.equal((await upload(actors.teacher, { schoolId: schools[1]._id })).status, 403);
  assert.equal((await upload(actors.teacher, {}, null)).status, 400);
  assert.equal((await upload(actors.teacher, {}, Buffer.alloc(0))).status, 400);
  assert.equal((await upload(actors.teacher, {}, Buffer.from('<script>'), 'fake.pdf')).status, 415);
  assert.equal((await upload(actors.teacher, {}, pdf, 'file.html', 'text/html')).status, 415);
  assert.equal((await upload(actors.teacher, {}, Buffer.alloc(100001))).status, 413);
  assert.equal(await FileAsset.countDocuments(), count);
  assert.equal(await used(), initial);
});

test('concurrent uploads cannot exceed the tenant quota', async () => {
  process.env.FILE_DEFAULT_QUOTA_BYTES = String(pdf.length);
  try {
    const results = await Promise.all([upload(), upload()]);
    assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
    assert.equal(await used(), pdf.length);
    await remove((await results.find(r => r.status === 201).json()).data);
    assert.equal(await used(), 0);
  } finally { process.env.FILE_DEFAULT_QUOTA_BYTES = '1000000'; }
});

test('active subscription quota overrides default; expired plans fall back to free quota', async () => {
  const subscription = await Subscription.create({ schoolId: schools[0]._id, storageGb: 0 });
  try {
    assert.equal((await upload()).status, 409);
    await Subscription.updateOne({ _id: subscription._id }, { expiresAt: new Date('2020-01-01') });
    await remove(await create());
    const response = await request('/files/usage');
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.quotaBytes, 1000000);
    assert.equal((await request(`/files/usage?schoolId=${schools[1]._id}`)).status, 403);
  } finally { await subscription.deleteOne(); }
});

test('failed storage write rolls back metadata and reserved bytes', async () => {
  const local = storage.adapter('local');
  const replacement = mock.method(storage, 'adapter', () => ({ ...local, put: async () => { throw new Error('Storage offline'); } }));
  try {
    assert.equal((await upload()).status, 503);
    assert.equal(await used(), 0);
    assert.equal(await FileAsset.countDocuments(), 0);
  } finally { replacement.mock.restore(); }
});

test('metadata failure aborts the quota reservation before writing a physical file', async () => {
  const replacement = mock.method(Material, 'create', async () => { throw new Error('Metadata write failed'); });
  try {
    assert.equal((await upload()).status, 500);
    assert.equal(await used(), 0);
    assert.equal(await FileAsset.countDocuments(), 0);
  } finally { replacement.mock.restore(); }
});

test('failed physical deletion retains quota and is retryable without double release', async () => {
  const material = await create();
  const local = storage.adapter('local');
  const replacement = mock.method(storage, 'adapter', () => ({ ...local, remove: async () => { throw new Error('Delete unavailable'); } }));
  try {
    assert.equal((await remove(material)).status, 503);
    assert.equal(await used(), pdf.length);
    assert.equal((await FileAsset.findById(material.fileAssetId)).status, 'DELETING');
  } finally { replacement.mock.restore(); }
  const responses = await Promise.all([remove(material), remove(material)]);
  assert.ok(responses.some(r => r.status === 200));
  assert.equal(await used(), 0);
  assert.equal(await FileAsset.countDocuments(), 0);
});

test('maintenance can clean interrupted uploads; API cannot delete an active upload', async () => {
  const material = await create();
  await FileAsset.updateOne({ _id: material.fileAssetId }, { status: 'UPLOADING' });
  assert.equal((await remove(material)).status, 409);
  await assert.rejects(require('../src/services/fileService').purgeAsset({ _id: material.fileAssetId }), { statusCode: 409 });
  const asset = await FileAsset.findOneAndUpdate({ _id: material.fileAssetId }, { status: 'DELETING' }, { new: true });
  await require('../src/services/fileService').purgeAsset(asset);
  assert.equal(await used(), 0);
  assert.equal(await Material.exists({ _id: material._id }), null);
});

test('storage keys reject traversal and S3 adapter uses private put/get/delete commands', async () => {
  assert.throws(() => storage.localPath('../../outside'));
  const commands = [];
  const remote = storage.createS3Storage({ send: async command => {
    commands.push(command);
    return { Body: Readable.from(pdf) };
  } });
  const asset = { bucket: 'private-test-bucket', key: 'school/opaque-key', buffer: pdf, mimeType: 'application/pdf' };
  await remote.put(asset);
  const data = [];
  for await (const chunk of await remote.read(asset)) data.push(chunk);
  assert.deepEqual(Buffer.concat(data), pdf);
  await remote.remove(asset);
  assert.deepEqual(commands.map(c => c.constructor.name), ['PutObjectCommand', 'GetObjectCommand', 'DeleteObjectCommand']);
  assert.deepEqual(commands[0].input.Body, pdf);
  assert.equal(commands[0].input.ContentType, 'application/pdf');
  for (const command of commands) {
    assert.equal(command.input.Bucket, asset.bucket);
    assert.equal(command.input.Key, asset.key);
    assert.equal(command.input.ACL, undefined);
  }
});
