const { test, before, after } = require('node:test'); const assert = require('node:assert/strict'); const mongoose = require('mongoose'); const jwt = require('jsonwebtoken'); const { MongoMemoryReplSet } = require('mongodb-memory-server');
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: 'platform-hardening-test', TENANT_BASE_DOMAIN: 'tenant.test' });
const app = require('../src/app'); const cache = require('../src/services/rolePermissionCache'); const { ROLE_PERMISSIONS } = require('../src/constants/permissions'); const { legacyPermissionsToEntries, DEFAULT_ROLE_LEVELS } = require('../src/constants/permissionCatalog'); const Role = require('../src/models/Role'); const Cluster = require('../src/models/Cluster'); const School = require('../src/models/School'); const User = require('../src/models/User'); const Class = require('../src/models/Class'); const AcademicYear = require('../src/models/AcademicYear'); const Attendance = require('../src/models/Attendance'); const Subscription = require('../src/models/Subscription'); const SharedTemplate = require('../src/models/SharedTemplate'); const TemplateDeployment = require('../src/models/TemplateDeployment'); const XLSX = require('xlsx'); const adminExtra = require('../src/services/adminExtraService'); const userService = require('../src/services/userService');
let mongo; let server; let origin; let cluster; let schoolA; let schoolB; let admin; let clusterAdmin;
const request = async (method, route, actor, body, host) => { const response = await fetch(`${origin}/v1/api${route}`, { method, headers: { 'Content-Type': 'application/json', Host: host || '127.0.0.1', Authorization: `Bearer ${jwt.sign({ _id: actor._id }, process.env.JWT_SECRET)}` }, body: body === undefined ? undefined : JSON.stringify(body) }); return { status: response.status, data: await response.json() }; };
before(async () => { mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); await mongoose.connect(mongo.getUri()); await Role.create(Object.entries(ROLE_PERMISSIONS).map(([code, keys]) => ({ code, name: code, level: DEFAULT_ROLE_LEVELS[code], permissions: legacyPermissionsToEntries(keys) }))); await cache.reload(); cluster = await Cluster.create({ name: 'Cluster', code: 'PHC' }); schoolA = await School.create({ name: 'School A', code: 'PHA', subdomain: 'a', clusterId: cluster._id }); schoolB = await School.create({ name: 'School B', code: 'PHB', subdomain: 'b', clusterId: cluster._id }); admin = await User.create({ name: 'Admin', email: 'platform-admin@a.invalid', role: 'SCHOOL_ADMIN', schoolId: schoolA._id, clusterId: cluster._id }); clusterAdmin = await User.create({ name: 'Cluster', email: 'platform-cluster@a.invalid', role: 'CLUSTER_ADMIN', clusterId: cluster._id }); server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); origin = `http://127.0.0.1:${server.address().port}`; });
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); if (mongo) await mongo.stop(); });

test('reports monitoring metrics, compares schools and enforces subdomain tenant routing', async () => { const monitoring = await request('GET', '/monitoring', admin); assert.equal(monitoring.status, 200); assert.equal(monitoring.data.data.database.status, 'up'); assert.equal(monitoring.data.data.schools.length, 1); const comparison = await request('GET', `/reports/schools/compare?schoolIds=${schoolA._id},${schoolB._id}`, clusterAdmin); assert.equal(comparison.status, 200); assert.equal(comparison.data.data.length, 2); const tenantContext = require('../src/middleware/tenant'); const checkHost = host => new Promise(resolve => tenantContext({ user: admin, hostname: host }, {}, error => resolve(error))); assert.equal((await checkHost('b.tenant.test')).statusCode, 403); assert.equal(await checkHost('a.tenant.test'), undefined); });

test('cross-school comparison includes attendance and exports scoped Excel/PDF', async () => {
  const [yearA, yearB] = await AcademicYear.create([
    { schoolId: schoolA._id, name: '2026-A', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') },
    { schoolId: schoolB._id, name: '2026-B', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') },
  ]);
  const [classA, classB] = await Class.create([
    { schoolId: schoolA._id, academicYearId: yearA._id, name: '10A', gradeLevel: 10 },
    { schoolId: schoolB._id, academicYearId: yearB._id, name: '10B', gradeLevel: 10 },
  ]);
  const [teacherA, teacherB, studentA, studentB] = await User.create([
    { name: 'Teacher A', email: 'compare-teacher-a@test.invalid', role: 'SUBJECT_TEACHER', schoolId: schoolA._id, clusterId: cluster._id },
    { name: 'Teacher B', email: 'compare-teacher-b@test.invalid', role: 'SUBJECT_TEACHER', schoolId: schoolB._id, clusterId: cluster._id },
    { name: 'Student A', email: 'compare-student-a@test.invalid', role: 'STUDENT', schoolId: schoolA._id, clusterId: cluster._id, classId: classA._id },
    { name: 'Student B', email: 'compare-student-b@test.invalid', role: 'STUDENT', schoolId: schoolB._id, clusterId: cluster._id, classId: classB._id },
  ]);
  await Attendance.create([
    { schoolId: schoolA._id, classId: classA._id, teacherId: teacherA._id, date: new Date(), records: [{ studentId: studentA._id, status: 'PRESENT' }, { studentId: studentA._id, status: 'ABSENT_UNEXCUSED' }] },
    { schoolId: schoolB._id, classId: classB._id, teacherId: teacherB._id, date: new Date(), records: [{ studentId: studentB._id, status: 'PRESENT' }] },
  ]);
  const comparison = await request('GET', `/reports/schools/compare?schoolIds=${schoolA._id},${schoolB._id}`, clusterAdmin);
  assert.equal(comparison.status, 200);
  const rowA = comparison.data.data.find(row => String(row.school._id) === String(schoolA._id));
  assert.equal(rowA.attendanceRecords, 2); assert.equal(rowA.presentCount, 1); assert.equal(rowA.absentCount, 1); assert.equal(rowA.attendanceRate, 50);
  const binary = async route => { const response = await fetch(`${origin}/v1/api${route}`, { headers: { Authorization: `Bearer ${jwt.sign({ _id: clusterAdmin._id }, process.env.JWT_SECRET)}` } }); return { response, buffer: Buffer.from(await response.arrayBuffer()) }; };
  const excel = await binary(`/reports/schools/compare/export.xlsx?schoolIds=${schoolA._id},${schoolB._id}`); assert.equal(excel.response.status, 200); assert.match(excel.response.headers.get('content-type'), /spreadsheetml/); assert.equal(XLSX.read(excel.buffer, { type: 'buffer' }).SheetNames[0], 'DoiChieu');
  const pdf = await binary(`/reports/schools/compare/export.pdf?schoolIds=${schoolA._id},${schoolB._id}`); assert.equal(pdf.response.status, 200); assert.match(pdf.response.headers.get('content-type'), /application\/pdf/); assert.equal(pdf.buffer.subarray(0, 5).toString(), '%PDF-');
});

test('syncs full template content to every deployment and rejects subscription overage', async () => { const tpl = await SharedTemplate.create({ name: 'Transcript template', type: 'TRANSCRIPT', scope: 'CLUSTER', clusterId: cluster._id, content: 'v1 frame', version: '1.0', createdBy: clusterAdmin._id }); await adminExtra.applyTemplateToSchool(clusterAdmin, schoolA._id, tpl._id); let deployed = await TemplateDeployment.findOne({ schoolId: schoolA._id, templateId: tpl._id }); assert.equal(deployed.content, 'v1 frame'); await adminExtra.updateTemplate(clusterAdmin, tpl._id, { content: 'v2 frame', version: '2.0' }); deployed = await TemplateDeployment.findOne({ schoolId: schoolA._id, templateId: tpl._id }); assert.equal(deployed.content, 'v2 frame'); await Subscription.create({ schoolId: schoolA._id, plan: 'FREE', maxStudents: 1, maxTeachers: 1, storageGb: 5, status: 'ACTIVE' }); await User.create({ name: 'Existing student', email: 'existing@a.invalid', role: 'STUDENT', schoolId: schoolA._id, status: 'ACTIVE' }); await assert.rejects(userService.createUser(admin, { name: 'Over limit', email: 'over@a.invalid', password: 'A strong passphrase 123!', role: 'STUDENT', schoolId: schoolA._id }), error => error.code === 'SUBSCRIPTION_LIMIT'); });




