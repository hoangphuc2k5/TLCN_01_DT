const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose'); const jwt = require('jsonwebtoken');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: 'fees-payroll-test' });
const app = require('../src/app'); const cache = require('../src/services/rolePermissionCache');
const { ROLE_PERMISSIONS } = require('../src/constants/permissions'); const { legacyPermissionsToEntries, DEFAULT_ROLE_LEVELS } = require('../src/constants/permissionCatalog');
const Role = require('../src/models/Role'); const School = require('../src/models/School'); const Year = require('../src/models/AcademicYear');
const User = require('../src/models/User'); const FeeInvoice = require('../src/models/FeeInvoice'); const Notification = require('../src/models/Notification'); const PayrollRecord = require('../src/models/PayrollRecord');
const XLSX = require('xlsx'); const { exportFeesExcel } = require('../src/services/crossService');
let mongo; let server; let origin; let school; let year; let student; let parent; let accountant; let invoice;
const request = async (method, route, actor, body) => { const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign({ _id: actor._id }, process.env.JWT_SECRET)}` }; const response = await fetch(`${origin}/v1/api${route}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }); return { status: response.status, data: await response.json() }; };
before(async () => { mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); await mongoose.connect(mongo.getUri()); await Role.create(Object.entries(ROLE_PERMISSIONS).map(([code, keys]) => ({ code, name: code, level: DEFAULT_ROLE_LEVELS[code], permissions: legacyPermissionsToEntries(keys) }))); await cache.reload(); school = await School.create({ name: 'Fees Payroll', code: 'FPR', subdomain: 'fpr' }); year = await Year.create({ schoolId: school._id, name: '2026', startDate: '2026-01-01', endDate: '2026-12-31' }); accountant = await User.create({ name: 'Accountant', email: 'accountant@fpr.invalid', role: 'ACCOUNTANT', schoolId: school._id }); student = await User.create({ name: 'Student', email: 'student@fpr.invalid', role: 'STUDENT', schoolId: school._id }); parent = await User.create({ name: 'Parent', email: 'parent@fpr.invalid', role: 'PARENT', schoolId: school._id, parentOf: [student._id] }); invoice = await FeeInvoice.create({ schoolId: school._id, studentId: student._id, academicYearId: year._id, title: 'Uniform fee', category: 'OTHER', description: 'Uniform and activity package', amount: 700000, dueDate: new Date(Date.now() - 86400000) }); server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); origin = `http://127.0.0.1:${server.address().port}`; });
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); if (mongo) await mongo.stop(); });

test('lists detailed other fees and sends idempotent debt reminders to student and parent', async () => { const debtors = await request('GET', '/fees/debtors', accountant); assert.equal(debtors.status, 200); assert.equal(debtors.data.data[0].category, 'OTHER'); assert.equal(debtors.data.data[0].outstanding, 700000); const first = await request('POST', '/fees/reminders/run', accountant, { minDaysOverdue: 1 }); assert.equal(first.status, 200); assert.equal(first.data.data.notifications, 2); assert.equal(await Notification.countDocuments({ type: 'FEE_REMINDER' }), 2); const second = await request('POST', '/fees/reminders/run', accountant, { minDaysOverdue: 1 }); assert.equal(second.status, 200); assert.equal(second.data.data.notifications, 0); assert.equal(await Notification.countDocuments({ type: 'FEE_REMINDER' }), 2); assert.equal((await FeeInvoice.findById(invoice._id)).status, 'OVERDUE'); });

test('creates a server-calculated multi-item invoice and allocates partial payment by item', async () => {
  const created = await request('POST', '/fees', accountant, {
    studentId: student._id, academicYearId: year._id, title: 'September fees', amount: 1,
    dueDate: '2026-09-30', lineItems: [
      { code: 'HP09', name: 'Tuition September', category: 'TUITION', quantity: 2, unitAmount: 100000 },
      { code: 'BT09', name: 'Boarding September', category: 'BOARDING', quantity: 1, unitAmount: 50000 },
    ],
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.data.amount, 250000);
  assert.deepEqual(created.data.data.lineItems.map(item => item.amount), [200000, 50000]);
  assert.ok(created.data.data.lineItems.every(item => item.status === 'UNPAID'));

  const paid = await request('POST', '/payments', accountant, { invoiceId: created.data.data._id, amount: 220000, method: 'CASH' });
  assert.equal(paid.status, 200);
  const stored = await FeeInvoice.findById(created.data.data._id);
  assert.equal(stored.paidAmount, 220000);
  assert.deepEqual(stored.lineItems.map(item => item.paidAmount), [200000, 20000]);

  const listed = await request('GET', '/fees', accountant);
  const row = listed.data.data.find(item => item._id === created.data.data._id);
  assert.deepEqual(row.lineItems.map(item => item.status), ['PAID', 'PARTIAL']);
  assert.deepEqual(row.lineItems.map(item => item.outstanding), [0, 30000]);

  const workbook = XLSX.read(await exportFeesExcel(accountant), { type: 'buffer' });
  const exported = XLSX.utils.sheet_to_json(workbook.Sheets.HocPhi);
  const exportedItems = exported.filter(item => item.HoaDon === 'September fees');
  assert.deepEqual(exportedItems.map(item => item.MaKhoan), ['HP09', 'BT09']);
  assert.deepEqual(exportedItems.map(item => item.DaThuTheoKhoan), [200000, 20000]);

  const invalid = await request('POST', '/fees', accountant, {
    studentId: student._id, academicYearId: year._id, title: 'Invalid', dueDate: '2026-09-30',
    lineItems: [{ name: '', quantity: 1, unitAmount: 1000 }],
  });
  assert.equal(invalid.status, 400);
});

test('creates, approves and pays payroll with tenant and amount validation', async () => { const created = await request('POST', '/payroll', accountant, { employeeId: accountant._id, period: '2026-09', baseSalary: 15000000, allowances: 1000000, deductions: 500000, note: 'Monthly payroll' }); assert.equal(created.status, 201); assert.equal(created.data.data.netAmount, 15500000); const id = created.data.data._id; assert.equal((await request('PATCH', `/payroll/${id}/status`, accountant, { status: 'PAID' })).status, 409); assert.equal((await request('PATCH', `/payroll/${id}/status`, accountant, { status: 'APPROVED' })).status, 200); assert.equal((await request('PATCH', `/payroll/${id}/status`, accountant, { status: 'PAID' })).status, 200); assert.equal((await PayrollRecord.findById(id)).status, 'PAID'); assert.equal((await request('POST', '/payroll', accountant, { employeeId: student._id, period: '2026-10', baseSalary: 1 })).status, 400); assert.equal((await request('POST', '/payroll', accountant, { employeeId: accountant._id, period: '2026-11', baseSalary: 10, deductions: 20 })).status, 400); });
