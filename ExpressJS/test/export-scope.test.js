const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');
const { MongoMemoryServer } = require('mongodb-memory-server');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'isolated-export-test-secret';
const app = require('../src/app');
const cache = require('../src/services/rolePermissionCache');
const { ROLE_PERMISSIONS } = require('../src/constants/permissions');
const { legacyPermissionsToEntries } = require('../src/constants/permissionCatalog');
const Role = require('../src/models/Role');
const School = require('../src/models/School');
const User = require('../src/models/User');
const Class = require('../src/models/Class');
const Grade = require('../src/models/Grade');
const Attendance = require('../src/models/Attendance');
const FeeInvoice = require('../src/models/FeeInvoice');
const Assignment = require('../src/models/TeacherAssignment');
const Subject = require('../src/models/Subject');
const Year = require('../src/models/AcademicYear');
const id = () => new mongoose.Types.ObjectId();
let mongo, server, origin, schools, students, actors, classes, year, subjects;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Role.create(Object.entries(ROLE_PERMISSIONS).map(([code, keys]) => ({ code, name: code, level: 20, permissions: legacyPermissionsToEntries(keys) })));
  await Role.create({ code: 'REPORT_READER', name: 'Report reader', level: 30, permissions: [{ resource: 'reports', actions: ['view'] }] });
  await cache.reload();
  const clusterA = id(), clusterB = id();
  schools = await School.create([0, 1, 2].map(i => ({ name: `School ${i}`, code: `S${i}`, subdomain: `s${i}`, clusterId: i === 2 ? clusterB : clusterA })));
  year = await Year.create({ schoolId: schools[0]._id, name: '2026', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') });
  classes = await Class.create([0, 1, 2, 3].map(i => ({ name: `Class ${i}`, schoolId: schools[i < 2 ? 0 : i - 1]._id, academicYearId: year._id, gradeLevel: 10 })));
  subjects = await Subject.create(['MATH', 'LIT'].map(code => ({ code, name: code, schoolId: schools[0]._id })));
  students = await User.create([0, 1, 2, 3, 4].map(i => ({ name: `Student ${i}`, code: `ST${i}`, email: `s${i}@test.invalid`, role: 'STUDENT', schoolId: schools[i < 3 ? 0 : i - 2]._id, classId: classes[i < 2 ? 0 : i - 1]._id })));
  actors = {};
  for (const [name, role] of Object.entries({ parent: 'PARENT', teacher: 'SUBJECT_TEACHER', school: 'SCHOOL_ADMIN', cluster: 'CLUSTER_ADMIN', global: 'SUPER_ADMIN', reader: 'REPORT_READER', librarian: 'LIBRARIAN' })) {
    actors[name] = await User.create({ name, email: `${name}@test.invalid`, role, schoolId: ['cluster', 'global'].includes(name) ? null : schools[0]._id, clusterId: clusterA, parentOf: name === 'parent' ? [students[0]._id, students[2]._id] : [] });
  }
  await Assignment.create({ schoolId: schools[0]._id, teacherId: actors.teacher._id, classId: classes[0]._id, subjectId: subjects[0]._id, academicYearId: year._id });
  for (const student of students) {
    await Grade.create({ schoolId: student.schoolId, classId: student.classId, academicYearId: year._id, subjectId: subjects[0]._id, studentId: student._id, teacherId: actors.teacher._id, average: 8 });
    await FeeInvoice.create({ schoolId: student.schoolId, studentId: student._id, academicYearId: year._id, title: 'Tuition', amount: 100, dueDate: new Date() });
  }
  await Grade.create({ schoolId: schools[0]._id, classId: classes[0]._id, academicYearId: year._id, subjectId: subjects[1]._id, studentId: students[0]._id, teacherId: actors.teacher._id, average: 9 });
  for (const c of classes) await Attendance.create({ schoolId: c.schoolId, classId: c._id, teacherId: actors.teacher._id, date: new Date(), records: students.filter(s => String(s.classId) === String(c._id)).map(s => ({ studentId: s._id, status: 'PRESENT' })) });
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

const request = (type, actor, query = '') => fetch(`${origin}/v1/api/export/${type}${query}`, { headers: { Authorization: `Bearer ${jwt.sign({ _id: actor._id }, process.env.JWT_SECRET)}` } });
const rows = async (type, actor, query) => {
  const response = await request(type, actor, query);
  assert.equal(response.status, 200);
  const workbook = XLSX.read(Buffer.from(await response.arrayBuffer()), { type: 'buffer' });
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
};
const codes = records => [...new Set(records.map(r => r.MaHS))].sort();

for (const type of ['grades', 'fees', 'attendance']) {
  test(`${type}: student only exports self`, async () => assert.deepEqual(codes(await rows(type, students[0])), ['ST0']));
  test(`${type}: parent only exports own children, including embedded attendance`, async () => assert.deepEqual(codes(await rows(type, actors.parent)), ['ST0', 'ST2']));
  test(`${type}: school admin and custom reader remain school scoped`, async () => {
    for (const actor of [actors.school, actors.reader]) assert.deepEqual(codes(await rows(type, actor)), ['ST0', 'ST1', 'ST2']);
  });
  test(`${type}: cluster excludes foreign cluster`, async () => assert.deepEqual(codes(await rows(type, actors.cluster)), ['ST0', 'ST1', 'ST2', 'ST3']));
  test(`${type}: super admin may export all schools`, async () => assert.equal(codes(await rows(type, actors.global)).length, 5));
  test(`${type}: query cannot override tenant or parent scope`, async () => {
    assert.deepEqual(await rows(type, actors.school, `?schoolId=${schools[2]._id}`), []);
    assert.deepEqual(await rows(type, actors.parent, `?studentId=${students[1]._id}`), []);
  });
  test(`${type}: unauthorized librarian is denied`, async () => assert.equal((await request(type, actors.librarian)).status, 403));
  test(`${type}: malformed ID returns 400`, async () => assert.equal((await request(type, actors.school, '?studentId=bad')).status, 400));
}
test('teacher grade export checks class, subject and academic year assignment', async () => {
  const result = await rows('grades', actors.teacher);
  assert.deepEqual(codes(result), ['ST0', 'ST1']);
  assert.deepEqual([...new Set(result.map(r => r.Mon))], ['MATH']);
});
test('teacher attendance export only contains assigned classes', async () => assert.deepEqual(codes(await rows('attendance', actors.teacher)), ['ST0', 'ST1']));
test('teacher cannot export fees without finance/report permission', async () => assert.equal((await request('fees', actors.teacher)).status, 403));
