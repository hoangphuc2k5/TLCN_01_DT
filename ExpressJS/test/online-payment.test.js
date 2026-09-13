const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'online-payment-test-secret';
process.env.PAYMENT_MOCK_SECRET = 'online-payment-mock-secret';
process.env.VNPAY_TMN_CODE = 'TESTCODE';
process.env.VNPAY_HASH_SECRET = 'isolated-vnpay-secret';
process.env.VNPAY_RETURN_URL = 'http://localhost:5173/payments/vnpay-return';
process.env.VNPAY_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

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
const OnlinePayment = require('../src/models/OnlinePayment');

// Independently encode callbacks instead of reusing the adapter under test.
const signedVnpay = payload => {
  const query = Object.keys(payload).filter(k => k.startsWith('vnp_') && k !== 'vnp_SecureHash').sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(payload[k]).replace(/%20/g, '+')}`).join('&');
  return { ...payload, vnp_SecureHash: crypto.createHmac('sha512', process.env.VNPAY_HASH_SECRET).update(query).digest('hex') };
};
const vnpCallback = row => ({ vnp_TmnCode: 'TESTCODE', vnp_TxnRef: row.providerOrderId,
  vnp_Amount: String(row.amount * 100), vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: '12345678' });
const vnpCall = async (payload, endpoint = 'ipn') => {
  const res = await fetch(`${origin}/v1/api/online-payments/vnpay/${endpoint}?${new URLSearchParams(payload)}`);
  return { httpStatus: res.status, ...await res.json() };
};
const newVnpay = async () => {
  const bill = await FeeInvoice.create({ schoolId: school._id, studentId: student._id, academicYearId: year._id, title: 'VNPay test', amount: 100000, dueDate: new Date() });
  const result = await request('POST', '/online-payments', student, { invoiceId: bill._id, provider: 'VNPAY', returnUrl: 'https://untrusted.invalid' });
  assert.equal(result.status, 201);
  return result.data;
};

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


test('VNPay checkout uses signed parameters, trusted return, GMT+7 and matching expiry', async () => {
  const row = await newVnpay();
  const url = new URL(row.checkoutUrl);
  assert.equal(url.origin, 'https://sandbox.vnpayment.vn');
  const p = Object.fromEntries(url.searchParams);
  assert.equal(p.vnp_SecureHash, signedVnpay(p).vnp_SecureHash);
  assert.equal(p.vnp_ReturnUrl, process.env.VNPAY_RETURN_URL);
  assert.equal(p.vnp_Amount, '10000000');
  assert.match(p.vnp_TxnRef, /^[a-z0-9]{1,100}$/i);
  assert.equal(p.vnp_ExpireDate, new Date(new Date(row.expiresAt).getTime() + 7 * 3600000).toISOString().replace(/\D/g, '').slice(0, 14));
  assert.equal(require('../src/services/vnpayGateway').timestamp(new Date('2026-09-09T18:30:00Z')), '20260910013000');
});

test('VNPay return is read-only; signed IPN settles exactly once even concurrently', async () => {
  const row = await newVnpay();
  const p = signedVnpay(vnpCallback(row));
  const returned = await vnpCall(p, 'return');
  assert.equal(returned.data.status, 'PENDING');
  assert.equal((await FeeInvoice.findById(row.invoiceId)).paidAmount, 0);
  const results = await Promise.all([vnpCall(p), vnpCall(p)]);
  assert.ok(results.every(r => r.httpStatus === 200 && ['00', '02'].includes(r.RspCode)));
  assert.equal(await Payment.countDocuments({ onlinePaymentId: row._id }), 1);
  assert.equal((await FeeInvoice.findById(row.invoiceId)).paidAmount, row.amount);
  assert.equal((await vnpCall(p)).RspCode, '02');
  assert.equal((await vnpCall(p, 'return')).data.status, 'PAID');
});

test('VNPay rejects invalid signatures, merchant, missing/wrong amount and unknown references', async () => {
  const row = await newVnpay();
  const p = vnpCallback(row);
  assert.equal((await vnpCall({ ...signedVnpay(p), vnp_Amount: '1' })).RspCode, '97');
  assert.equal((await vnpCall(signedVnpay({ ...p, vnp_Amount: '1' }))).RspCode, '04');
  assert.equal((await vnpCall(signedVnpay({ ...p, vnp_Amount: '' }))).RspCode, '04');
  assert.equal((await vnpCall(signedVnpay({ ...p, vnp_TmnCode: 'OTHER' }))).RspCode, '99');
  assert.equal((await vnpCall(signedVnpay({ ...p, vnp_TransactionStatus: '' }))).RspCode, '99');
  assert.equal((await vnpCall(signedVnpay({ ...p, vnp_TxnRef: 'missing' }))).RspCode, '01');
  const duplicate = new URLSearchParams(signedVnpay(p)); duplicate.append('vnp_Amount', '1');
  const response = await fetch(`${origin}/v1/api/online-payments/vnpay/ipn?${duplicate}`);
  assert.equal((await response.json()).RspCode, '97');
  assert.equal((await OnlinePayment.findById(row._id)).status, 'PENDING');
  assert.equal((await FeeInvoice.findById(row.invoiceId)).paidAmount, 0);
});

test('VNPay cancellation and inconsistent response/status never credit invoice', async () => {
  for (const responseCode of ['24', '00']) {
    const row = await newVnpay();
    const p = signedVnpay({ ...vnpCallback(row), vnp_ResponseCode: responseCode, vnp_TransactionStatus: '02' });
    assert.equal((await vnpCall(p)).RspCode, '00');
    assert.equal((await OnlinePayment.findById(row._id)).status, 'FAILED');
    assert.equal((await FeeInvoice.findById(row.invoiceId)).paidAmount, 0);
    assert.equal(await Payment.countDocuments({ onlinePaymentId: row._id }), 0);
  }
});

test('VNPay verifies amounts before acknowledging duplicates; unsigned amount cannot override signed amount', async () => {
  const row = await newVnpay();
  const p = signedVnpay(vnpCallback(row));
  assert.equal((await vnpCall({ ...p, amount: '1' })).RspCode, '00');
  assert.equal((await vnpCall(signedVnpay({ ...vnpCallback(row), vnp_Amount: '1' }))).RspCode, '04');
  assert.equal((await FeeInvoice.findById(row.invoiceId)).paidAmount, row.amount);
});

test('VNPay rolls back settlement if invoice has already been collected', async () => {
  const row = await newVnpay();
  await FeeInvoice.updateOne({ _id: row.invoiceId }, { $set: { paidAmount: row.amount, status: 'PAID' } });
  assert.equal((await vnpCall(signedVnpay(vnpCallback(row)))).RspCode, '99');
  assert.equal((await OnlinePayment.findById(row._id)).status, 'PENDING');
  assert.equal(await Payment.countDocuments({ onlinePaymentId: row._id }), 0);
});

test('VNPay requires configuration and rejects fractional VND', async () => {
  const gateway = require('../src/services/vnpayGateway');
  await assert.rejects(gateway.createPayment({ orderId: 'test', amount: 1.1 }), { statusCode: 400 });
  const original = process.env.VNPAY_RETURN_URL;
  try {
    delete process.env.VNPAY_RETURN_URL;
    await assert.rejects(gateway.createPayment({ orderId: 'test', amount: 10000 }), { statusCode: 503 });
  } finally { process.env.VNPAY_RETURN_URL = original; }
});

test('manual collection races safely with VNPay settlement and cannot forge ONLINE receipts', async () => {
  const row = await newVnpay();
  const forged = await request('POST', '/payments', admin, { invoiceId: row.invoiceId, amount: row.amount, method: 'ONLINE' });
  assert.equal(forged.status, 400);
  const [manual, ipn] = await Promise.all([
    request('POST', '/payments', admin, { invoiceId: row.invoiceId, amount: row.amount, method: 'CASH' }),
    vnpCall(signedVnpay(vnpCallback(row))),
  ]);
  assert.ok([200, 201, 409].includes(manual.status));
  assert.ok(['00', '99'].includes(ipn.RspCode));
  assert.equal((await FeeInvoice.findById(row.invoiceId)).paidAmount, row.amount);
  assert.equal(await Payment.countDocuments({ invoiceId: row.invoiceId }), 1);
});

test('request id cannot be reused for a different invoice or provider', async () => {
  const row = await newVnpay();
  // Use a fresh request key on the existing checkout, then attempt another invoice.
  const key = 'bound-request';
  await OnlinePayment.updateOne({ _id: row._id }, { $set: { requestKey: `${school._id}:${student._id}:${key}` } });
  const other = await newVnpay();
  assert.equal((await request('POST', '/online-payments', student, { invoiceId: other.invoiceId, provider: 'VNPAY', clientRequestId: key })).status, 409);
});
