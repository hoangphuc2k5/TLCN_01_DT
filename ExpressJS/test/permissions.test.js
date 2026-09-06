const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'isolated-permission-test-secret';
const app = require('../src/app');
const Role = require('../src/models/Role');
const User = require('../src/models/User');
const cache = require('../src/services/rolePermissionCache');
const { authorizePermissionAction } = require('../src/middleware/rbac');
let mongo, server, origin, reader, inactive, schoolId;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  schoolId = new mongoose.Types.ObjectId();
  await Role.create([
    { code: 'READ_USERS', name: 'Reader', level: 20, permissions: [{ resource: 'users', actions: ['view'] }] },
    { code: 'SCHOOL_ADMIN', name: 'Disabled admin', level: 20, status: 'INACTIVE', permissions: [{ resource: 'users', actions: ['view', 'create', 'update', 'delete'] }] },
  ]);
  reader = await User.create({ name: 'Reader', email: 'reader@test.invalid', role: 'READ_USERS', schoolId });
  inactive = await User.create({ name: 'Disabled', email: 'disabled@test.invalid', role: 'SCHOOL_ADMIN', schoolId });
  await cache.reload();
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

const request = (path, actor = reader, method = 'GET', body) => fetch(origin + '/v1/api' + path, {
  method, headers: { 'Content-Type': 'application/json', ...(actor ? { Authorization: `Bearer ${jwt.sign({ _id: actor._id }, process.env.JWT_SECRET)}` } : {}) },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

test('read-only custom role can list users without create/update/delete', async () => {
  const response = await request('/users');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).EC, 0);
});

for (const [method, url] of [['POST', '/users'], ['PUT', '/users/000000000000000000000001'], ['DELETE', '/users/000000000000000000000001'], ['POST', '/users/000000000000000000000001/reset-password'], ['POST', '/import/users']]) {
  test(`read-only custom role cannot ${method} ${url}`, async () => {
    assert.equal((await request(url, reader, method, {})).status, 403);
  });
}

test('unauthenticated request is rejected', async () => {
  assert.equal((await request('/users', null)).status, 401);
});

test('disabled system role does not regain static permissions', async () => {
  assert.equal((await request('/users', inactive)).status, 403);
  assert.equal(cache.hasPermissionLegacySync('SCHOOL_ADMIN', 'MANAGE_USERS'), false);
});

test('empty active role collection fails closed', async () => {
  await Role.updateOne({ code: 'READ_USERS' }, { status: 'INACTIVE' });
  await cache.reload();
  try {
    assert.equal((await request('/users', reader)).status, 403);
    assert.equal(await cache.canAccess('SCHOOL_ADMIN', 'users', 'create'), false);
  } finally {
    await Role.updateOne({ code: 'READ_USERS' }, { status: 'ACTIVE' });
    await cache.reload();
  }
});

test('upsert requires both create and update', async () => {
  const middleware = authorizePermissionAction(['create', 'update'], 'MANAGE_USERS');
  const error = await new Promise(resolve => middleware({ user: reader }, {}, resolve));
  assert.equal(error.statusCode, 403);
});

test('unknown permission cannot authorize even a super admin', async () => {
  const error = await new Promise(resolve => authorizePermissionAction('view', 'UNKNOWN')({ user: { role: 'SUPER_ADMIN' } }, {}, resolve));
  assert.equal(error.statusCode, 403);
});
