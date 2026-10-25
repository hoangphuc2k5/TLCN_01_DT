const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: 'subscription-integration-secret' });
const app = require('../../app');
const { ROLE_PERMISSIONS } = require('../../config/constants/permissions.config');
const { legacyPermissionsToEntries, DEFAULT_ROLE_LEVELS } = require('../../config/constants/permission-catalog.config');
const cache = require('../../config/container').services['role-permission-cache'];
const Role = require('../../models/admin/role.model');
const School = require('../../models/admin/school.model');
const User = require('../../models/admin/user.model');
const Subscription = require('../../models/admin/subscription.model');
const SubscriptionInvoice = require('../../models/admin/subscription-invoice.model');

let mongo; let server; let origin; let admin; let subscription;

before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Role.create(Object.entries(ROLE_PERMISSIONS).map(([code, keys]) => ({
    code, name: code, level: DEFAULT_ROLE_LEVELS[code], permissions: legacyPermissionsToEntries(keys),
  })));
  await cache.reload();
  const school = await School.create({ name: 'Subscription School', code: 'SBS', subdomain: 'sbs' });
  subscription = await Subscription.create({ schoolId: school._id, plan: 'BASIC', expiresAt: new Date('2026-06-30T23:59:59.000Z') });
  admin = await User.create({ name: 'Super Admin', email: 'super@subscription.invalid', role: 'SUPER_ADMIN' });
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}/v1/api`;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

const markPaid = async id => {
  const response = await fetch(`${origin}/subscription-invoices/${id}/paid`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${jwt.sign({ _id: admin._id }, process.env.JWT_SECRET)}` },
  });
  return { status: response.status, body: await response.json() };
};

test('paying a subscription invoice keeps invoice and expiry consistent without shortening a later term', async () => {
  const current = await SubscriptionInvoice.create({
    schoolId: subscription.schoolId, subscriptionId: subscription._id, plan: 'BASIC', amount: 2000000,
    periodStart: new Date('2026-01-01T00:00:00.000Z'), periodEnd: new Date('2026-12-31T23:59:59.000Z'),
  });
  const old = await SubscriptionInvoice.create({
    schoolId: subscription.schoolId, subscriptionId: subscription._id, plan: 'BASIC', amount: 2000000,
    periodStart: new Date('2025-01-01T00:00:00.000Z'), periodEnd: new Date('2025-12-31T23:59:59.000Z'),
  });

  assert.equal((await markPaid(current._id)).status, 200);
  assert.equal((await Subscription.findById(subscription._id)).expiresAt.toISOString(), current.periodEnd.toISOString());
  assert.equal((await SubscriptionInvoice.findById(current._id)).status, 'PAID');
  assert.equal((await markPaid(old._id)).status, 200);
  assert.equal((await Subscription.findById(subscription._id)).expiresAt.toISOString(), current.periodEnd.toISOString());
});
