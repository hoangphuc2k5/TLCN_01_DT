const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'online-payment-test-secret';
process.env.PAYMENT_MOCK_SECRET = 'online-payment-mock-secret';

const app = require('../src/app');
const cache = require('../src/services/rolePermissionCache');
const { ROLE_PERMISSIONS } = require('../src/constants/permissions');
const { legacyPermissionsToEntries, DEFAULT_ROLE_LEVELS } = require('../src/constants/permissionCatalog');
const Role = require('../src/models/Role');
const School = require('../src/models/School');
const Year = require('../src/models/AcademicYear');
const User = require('../src/models/User');
const FeeInvoice = require('../src/models/FeeInvoice');
const Payment = require('../src/models/Payment');
const { canonical } = require('../src/services/paymentGateway');

let mongo; let server; let origin; let school; let year; let student; let parent; let admin; let invoice;
const sign = payload => crypto.createHmac('sha256', process.env.PAYMENT_MOCK_SECRET).update(canonical(payload)).digest('hex');
const request = async (method, path, actor, body, extraHeaders = {}) => {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  if (actor) headers.Authorization = `Bearer ${jwt.sign({ _id: actor._id }, process.env.JWT_SECRET)}`;
  const response = await fetch(`${origin}/v1/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, ...(await response.json()) };
};

before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Role.create(Object.entries(ROLE_PERMISSIONS).map(([code, keys]) => ({
    code, name: code, level: DEFAULT_ROLE_LEVELS[code], permissions: legacyPermissionsToEntries(keys),
  })));
  await cache.reload();
  school = await School.create({ name: 'Online Payment School', code: 'OPS', subdomain: 'ops' });
  year = await Year.create({ schoolId: school._id, name: '2026', startDate: '2026-08-01', endDate: '2027-06-30' });
  admin = await User.create({ name: 'admin', email: 'admin@online.invalid', role: 'SCHOOL_ADMIN', schoolId: school._id });
  student = await User.create({ name: 'student', email: 'student@online.invalid', role: 'STUDENT', schoolId: school._id });
  parent = await User.create({ name: 'parent', email: 'parent@online.invalid', role: 'PARENT', schoolId: school._id, parentOf: [student._id] });
  invoice = await FeeInvoice.create({ schoolId: school._id, studentId: student._id, academicYearId: year._id, title: 'Tuition', amount: 1250000, dueDate: new Date(Date.now() + 86400000) });
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  await mongo.stop();
});

test('creates online payment, verifies signed webhook and remains idempotent', async () => {
  const created = await request('POST', '/online-payments', student, { invoiceId: invoice._id, provider: 'MOCK', clientRequestId: 'checkout-1' });
  assert.equal(created.status, 201);
  assert.equal(created.data.amount, 1250000);
  const repeated = await request('POST', '/online-payments', student, { invoiceId: invoice._id, provider: 'MOCK', clientRequestId: 'checkout-1' });
  assert.equal(repeated.status, 201);
  assert.equal(String(repeated.data._id), String(created.data._id));

  const payload = { orderId: created.data.providerOrderId, amount: 1250000, status: 'PAID', transactionId: 'mock-tx-1' };
  const bad = await request('POST', '/online-payments/webhook/MOCK', null, payload, { 'x-payment-signature': 'bad' });
  assert.equal(bad.status, 401);
  const paid = await request('POST', '/online-payments/webhook/MOCK', null, payload, { 'x-payment-signature': sign(payload) });
  assert.equal(paid.status, 200);
  assert.equal(paid.data.status, 'PAID');
  const paidAgain = await request('POST', '/online-payments/webhook/MOCK', null, payload, { 'x-payment-signature': sign(payload) });
  assert.equal(paidAgain.status, 200);
  assert.equal((await FeeInvoice.findById(invoice._id)).paidAmount, 1250000);
  assert.equal(await Payment.countDocuments({ onlinePaymentId: created.data._id }), 1);
});

test('parent can pay a child invoice but cannot access another student invoice', async () => {
  const parentInvoice = await FeeInvoice.create({ schoolId: school._id, studentId: student._id, academicYearId: year._id, title: 'Activity fee', amount: 500000, dueDate: new Date(Date.now() + 86400000) });
  const own = await request('POST', '/online-payments', parent, { invoiceId: parentInvoice._id, provider: 'MOCK' });
  assert.equal(own.status, 201);
  const other = await User.create({ name: 'other', email: 'other@online.invalid', role: 'STUDENT', schoolId: school._id });
  const otherInvoice = await FeeInvoice.create({ schoolId: school._id, studentId: other._id, academicYearId: year._id, title: 'Other', amount: 100, dueDate: new Date(Date.now() + 86400000) });
  const denied = await request('POST', '/online-payments', parent, { invoiceId: otherInvoice._id, provider: 'MOCK' });
  assert.equal(denied.status, 404);
});
