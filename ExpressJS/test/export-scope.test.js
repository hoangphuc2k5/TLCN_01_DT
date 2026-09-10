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
const Leave = require('../src/models/LeaveRequest');
const Timetable = require('../src/models/Timetable');
const Message = require('../src/models/Message');
const Book = require('../src/models/LibraryBook');
const Loan = require('../src/models/BookLoan');
const Material = require('../src/models/LearningMaterial');
const Facility = require('../src/models/FacilityRequest');
const Template = require('../src/models/SharedTemplate');
const Exam = require('../src/models/Exam');
const Attempt = require('../src/models/ExamAttempt');
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
  test(`${type}: JSON list enforces personal and cluster scope too`, async () => {
    for (const [actor, expected] of [[students[0], ['ST0']], [actors.parent, ['ST0', 'ST2']], [actors.cluster, ['ST0', 'ST1', 'ST2', 'ST3']]]) {
      const response = await fetch(`${origin}/v1/api/${type}`, { headers: { Authorization: `Bearer ${jwt.sign({ _id: actor._id }, process.env.JWT_SECRET)}` } });
      assert.equal(response.status, 200);
      const data = (await response.json()).data;
      const identifiers = type === 'attendance' ? data.flatMap(d => d.records.map(r => r.studentId.code)) : data.map(d => d.studentId.code);
      assert.deepEqual([...new Set(identifiers)].sort(), expected);
    }
  });
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

const write = (path, actor, data, method = 'PATCH') => fetch(`${origin}/v1/api${path}`, {
  method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign({ _id: actor._id }, process.env.JWT_SECRET)}` }, body: JSON.stringify(data),
});
const makeLeave = (overrides = {}) => Leave.create({ schoolId: schools[0]._id, requesterId: students[0]._id, studentId: students[0]._id, type: 'STUDENT_ABSENCE', reason: 'Test', fromDate: new Date(), toDate: new Date(), ...overrides });

test('school cannot review another school leave', async () => {
  const leave = await makeLeave({ schoolId: schools[1]._id });
  assert.equal((await write(`/leave-requests/${leave._id}/review`, actors.school, { status: 'APPROVED' })).status, 404);
  assert.equal((await Leave.findById(leave._id)).status, 'PENDING');
});
test('cluster can review its school but cannot review another cluster', async () => {
  const own = await makeLeave({ schoolId: schools[1]._id });
  const foreign = await makeLeave({ schoolId: schools[2]._id });
  assert.equal((await write(`/leave-requests/${own._id}/review`, actors.cluster, { status: 'APPROVED' })).status, 200);
  assert.equal((await write(`/leave-requests/${foreign._id}/review`, actors.cluster, { status: 'APPROVED' })).status, 404);
});
test('cannot self-approve leave', async () => {
  const leave = await makeLeave({ requesterId: actors.school._id, studentId: null, type: 'TEACHER_ABSENCE' });
  assert.equal((await write(`/leave-requests/${leave._id}/review`, actors.school, { status: 'APPROVED' })).status, 403);
});
test('concurrent leave reviews produce exactly one success', async () => {
  const leave = await makeLeave();
  const responses = await Promise.all(['APPROVED', 'REJECTED'].map(status => write(`/leave-requests/${leave._id}/review`, actors.school, { status })));
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
});
test('homeroom teacher can review only student absence from own class', async () => {
  const home = await User.create({ name: 'Home', email: 'home@test.invalid', role: 'HOMEROOM_TEACHER', schoolId: schools[0]._id });
  await Class.updateOne({ _id: classes[0]._id }, { homeroomTeacherId: home._id });
  const own = await makeLeave();
  const other = await makeLeave({ studentId: students[2]._id, requesterId: students[2]._id });
  const teacher = await makeLeave({ type: 'TEACHER_ABSENCE', studentId: null, requesterId: actors.teacher._id });
  assert.equal((await write(`/leave-requests/${own._id}/review`, home, { status: 'APPROVED' })).status, 200);
  for (const leave of [other, teacher]) assert.equal((await write(`/leave-requests/${leave._id}/review`, home, { status: 'APPROVED' })).status, 403);
});
test('invalid leave date interval is rejected', async () => {
  const result = await write('/leave-requests', students[0], { type: 'STUDENT_ABSENCE', reason: 'Test', fromDate: '2026-09-07', toDate: '2026-09-05' }, 'POST');
  assert.equal(result.status, 400);
});
test('timetable approval enforces school scope and draft state', async () => {
  const own = await Timetable.create({ schoolId: schools[0]._id, classId: classes[0]._id, academicYearId: year._id, slots: [] });
  const foreign = await Timetable.create({ schoolId: schools[1]._id, classId: classes[2]._id, academicYearId: year._id, slots: [] });
  assert.equal((await write(`/timetables/${foreign._id}/approve`, actors.school, {})).status, 404);
  assert.equal((await write(`/timetables/${own._id}/approve`, actors.school, {})).status, 200);
  assert.equal((await write(`/timetables/${own._id}/approve`, actors.school, {})).status, 409);
});
test('saving timetable cannot bypass approval or inject a foreign class', async () => {
  assert.equal((await write('/timetables', actors.school, { academicYearId: year._id, classId: classes[1]._id, status: 'APPROVED', slots: [] }, 'POST')).status, 400);
  assert.equal((await write('/timetables', actors.school, { academicYearId: year._id, classId: classes[2]._id, slots: [] }, 'POST')).status, 403);
});
test('parent timetable query cannot override children scope', async () => {
  const token = jwt.sign({ _id: actors.parent._id }, process.env.JWT_SECRET);
  const response = await fetch(`${origin}/v1/api/timetables?classId=${classes[2]._id}`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, []);
});
test('cross-school message and unrelated reply are rejected without creating messages', async () => {
  const initial = await Message.countDocuments();
  assert.equal((await write('/messages', students[0], { receiverId: students[3]._id, body: 'Test' }, 'POST')).status, 403);
  assert.equal((await write('/messages', students[0], { receiverId: students[1]._id, body: 'Test', parentMessageId: id() }, 'POST')).status, 403);
  assert.equal(await Message.countDocuments(), initial);
});

test('grade write accepts assigned teacher and rejects another class or student', async () => {
  const payload = { academicYearId: year._id, classId: classes[0]._id, subjectId: subjects[0]._id, studentId: students[0]._id, scores: [{ type: 'ORAL', score: 7 }] };
  assert.equal((await write('/grades', actors.teacher, payload, 'POST')).status, 200);
  assert.equal((await write('/grades', actors.teacher, { ...payload, classId: classes[1]._id, studentId: students[2]._id }, 'POST')).status, 403);
  assert.equal((await write('/grades', actors.school, { ...payload, studentId: students[3]._id }, 'POST')).status, 403);
});
test('teacher cannot append score to an unassigned subject', async () => {
  const grade = await Grade.findOne({ studentId: students[0]._id, subjectId: subjects[1]._id });
  const before = grade.scores.length;
  assert.equal((await write(`/grades/${grade._id}/scores`, actors.teacher, { type: 'ORAL', score: 10 }, 'POST')).status, 403);
  assert.equal((await Grade.findById(grade._id)).scores.length, before);
});
test('attendance rejects student from another class before changing records', async () => {
  const count = await Attendance.countDocuments();
  const payload = { classId: classes[0]._id, subjectId: subjects[0]._id, date: '2026-09-06', records: [{ studentId: students[2]._id, status: 'PRESENT' }] };
  assert.equal((await write('/attendance', actors.teacher, payload, 'POST')).status, 403);
  assert.equal(await Attendance.countDocuments(), count);
});
test('school cannot create fee for a foreign student', async () => {
  const count = await FeeInvoice.countDocuments();
  assert.equal((await write('/fees', actors.school, { studentId: students[3]._id, academicYearId: year._id, title: 'Test', amount: 100, dueDate: '2026-10-01' }, 'POST')).status, 403);
  assert.equal(await FeeInvoice.countDocuments(), count);
});
test('payment cannot use zero or negative amount', async () => {
  const invoice = await FeeInvoice.findOne({ studentId: students[0]._id });
  for (const amount of [0, -1]) assert.equal((await write('/payments', actors.school, { invoiceId: invoice._id, amount }, 'POST')).status, 400);
});
test('subject mutation checks tenant and ignores injected schoolId', async () => {
  const foreign = await Subject.create({ name: 'Foreign', code: 'FOREIGN', schoolId: schools[1]._id });
  assert.equal((await write(`/subjects/${foreign._id}`, actors.school, { name: 'Changed' }, 'PUT')).status, 404);
  assert.equal((await write(`/subjects/${subjects[0]._id}`, actors.school, { name: 'MATH', schoolId: schools[1]._id }, 'PUT')).status, 200);
  assert.equal(String((await Subject.findById(subjects[0]._id)).schoolId), String(schools[0]._id));
});
test('class update cannot promote arbitrary user to homeroom teacher', async () => {
  assert.equal((await write(`/classes/${classes[0]._id}`, actors.school, { homeroomTeacherId: students[0]._id }, 'PUT')).status, 403);
  assert.equal((await User.findById(students[0]._id)).role, 'STUDENT');
});
test('assignment validates all tenant references', async () => {
  const payload = { teacherId: actors.teacher._id, classId: classes[0]._id, subjectId: subjects[0]._id, academicYearId: year._id };
  assert.equal((await write('/assignments', actors.school, { ...payload, classId: classes[2]._id }, 'POST')).status, 403);
});
test('assignment deletion cannot cross school', async () => {
  const assignment = await Assignment.create({ teacherId: actors.teacher._id, schoolId: schools[1]._id, classId: classes[2]._id, subjectId: subjects[0]._id, academicYearId: year._id });
  assert.equal((await write(`/assignments/${assignment._id}`, actors.school, {}, 'DELETE')).status, 404);
  assert.ok(await Assignment.findById(assignment._id));
});
test('class roster endpoint filters parent children and denies foreign school', async () => {
  const headers = { Authorization: `Bearer ${jwt.sign({ _id: actors.parent._id }, process.env.JWT_SECRET)}` };
  const response = await fetch(`${origin}/v1/api/classes/${classes[0]._id}/students`, { headers });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data.map(s => s.code), ['ST0']);
  assert.equal((await fetch(`${origin}/v1/api/classes/${classes[2]._id}/students`, { headers })).status, 404);
});

test('library mutation denies foreign book and invalid borrower without reducing stock', async () => {
  const foreign = await Book.create({ schoolId: schools[1]._id, title: 'Foreign', quantity: 2, available: 2 });
  assert.equal((await write(`/library/books/${foreign._id}`, actors.librarian, { title: 'Changed' }, 'PUT')).status, 404);
  const own = await Book.create({ schoolId: schools[0]._id, title: 'Own', quantity: 2, available: 2 });
  assert.equal((await write('/library/loans', actors.librarian, { bookId: own._id, borrowerId: students[3]._id, dueAt: '2026-12-01' }, 'POST')).status, 403);
  assert.equal((await Book.findById(own._id)).available, 2);
  const loan = await Loan.create({ schoolId: schools[1]._id, bookId: foreign._id, borrowerId: students[3]._id, dueAt: new Date() });
  assert.equal((await write(`/library/loans/${loan._id}/return`, actors.librarian, {})).status, 404);
});
test('material and facility mutations require both permission and tenant scope', async () => {
  const material = await Material.create({ schoolId: schools[1]._id, title: 'Foreign', uploadedBy: actors.teacher._id });
  assert.equal((await write(`/materials/${material._id}`, actors.school, {}, 'DELETE')).status, 404);
  const facility = await Facility.create({ schoolId: schools[1]._id, requesterId: actors.teacher._id, itemName: 'Room', from: new Date(), to: new Date() });
  assert.equal((await write(`/facilities/${facility._id}/review`, actors.school, { status: 'APPROVED' })).status, 403);
  assert.equal((await write(`/facilities/${facility._id}/review`, actors.librarian, { status: 'APPROVED' })).status, 404);
});
test('template apply rejects foreign-cluster template and role owner cannot edit global template', async () => {
  const template = await Template.create({ name: 'Foreign', type: 'TRANSCRIPT', scope: 'CLUSTER', clusterId: schools[2].clusterId, createdBy: actors.global._id });
  assert.equal((await write(`/schools/${schools[0]._id}/apply-template`, actors.school, { templateId: template._id }, 'POST')).status, 403);
  assert.equal((await write(`/templates/${template._id}`, actors.school, { content: 'Changed' }, 'PUT')).status, 403);
});
test('user update cannot move schools or inject foreign class/children', async () => {
  for (const body of [{ schoolId: schools[1]._id, classId: null }, { classId: classes[2]._id }]) {
    assert.equal((await write(`/users/${students[0]._id}`, actors.school, body, 'PUT')).status, 403);
  }
  assert.equal((await write(`/users/${actors.parent._id}`, actors.school, { parentOf: [students[3]._id] }, 'PUT')).status, 403);
  assert.equal(String((await User.findById(students[0]._id)).schoolId), String(schools[0]._id));
});
test('role creation cannot delegate permissions absent from actor', async () => {
  const response = await write('/roles', actors.school, { code: 'ESCALATION', name: 'Escalation', level: 40, permissions: [{ resource: 'subscriptions', actions: ['create'] }] }, 'POST');
  assert.equal(response.status, 403);
  assert.equal(await Role.countDocuments({ code: 'ESCALATION' }), 0);
});
test('custom role is tenant-owned; other schools cannot edit or assign it', async () => {
  const response = await write('/roles', actors.school, { code: 'LOCAL_READER', name: 'Local reader', level: 40, permissions: [{ resource: 'grades', actions: ['view'] }] }, 'POST');
  assert.equal(response.status, 201);
  const role = await Role.findOne({ code: 'LOCAL_READER' });
  assert.equal(String(role.schoolId), String(schools[0]._id));
  const foreignAdmin = await User.create({ name: 'Foreign admin', email: 'foreign-admin@test.invalid', schoolId: schools[1]._id, role: 'SCHOOL_ADMIN' });
  assert.equal((await write(`/roles/${role._id}`, foreignAdmin, { name: 'Changed' }, 'PUT')).status, 403);
  assert.equal((await write(`/users/${students[3]._id}`, foreignAdmin, { role: role.code }, 'PUT')).status, 403);
});
test('school admin cannot edit a globally shared role', async () => {
  const role = await Role.findOne({ code: 'STUDENT' });
  assert.equal((await write(`/roles/${role._id}`, actors.school, { permissions: [] }, 'PUT')).status, 403);
});

const makeExam = (overrides = {}) => Exam.create({ schoolId: schools[0]._id, classId: classes[0]._id, subjectId: subjects[0]._id, createdBy: actors.teacher._id, title: 'Scope exam', status: 'PUBLISHED', questions: [{ type: 'MCQ', prompt: '1+1?', options: [{ key: 'A', text: '2' }], correctKey: 'A', points: 1 }, { type: 'ESSAY', prompt: 'Explain', points: 3 }], ...overrides });
const read = (path, actor) => fetch(`${origin}/v1/api${path}`, { headers: { Authorization: `Bearer ${jwt.sign({ _id: actor._id }, process.env.JWT_SECRET)}` } });

test('audit: parent dashboard rejects stale foreign-school child links', async () => {
  const parent = await User.create({ name: 'Stale parent', email: 'stale-parent@test.invalid', role: 'PARENT', schoolId: schools[0]._id, parentOf: [students[0]._id, students[3]._id] });
  const response = await read('/dashboard', parent);
  assert.equal(response.status, 200);
  const data = (await response.json()).data;
  assert.equal(data.stats.find(s => s.key === 'children').value, 1);
  assert.ok(data.grades.length > 0);
  assert.ok(data.grades.every(g => String(g.studentId._id) === String(students[0]._id)));
  assert.ok(data.invoices.every(i => String(i.studentId) === String(students[0]._id)));
});

test('audit: teacher dashboard uses current class/subject/year scope', async () => {
  const data = (await (await read('/dashboard', actors.teacher)).json()).data;
  const grades = await Grade.countDocuments({ schoolId: schools[0]._id, classId: classes[0]._id, subjectId: subjects[0]._id, academicYearId: year._id, teacherId: actors.teacher._id });
  const attendance = await Attendance.countDocuments({ schoolId: schools[0]._id, classId: classes[0]._id, teacherId: actors.teacher._id });
  assert.equal(data.stats.find(s => s.key === 'gradeSheets').value, grades);
  assert.equal(data.stats.find(s => s.key === 'attendanceSessions').value, attendance);
});

test('audit: dashboard honors revoked personal and teacher read permissions', async () => {
  for (const actor of [actors.parent, actors.teacher]) {
    const role = await Role.findOne({ code: actor.role });
    const original = role.permissions.toObject();
    try {
      await Role.updateOne({ _id: role._id }, { permissions: [] });
      await cache.reload();
      const response = await read('/dashboard', actor);
      assert.equal(response.status, 200);
      const data = (await response.json()).data;
      assert.ok(!data.grades?.length && !data.invoices?.length);
      assert.ok(!data.stats.some(s => ['children', 'grades', 'invoices', 'gradeSheets', 'attendanceSessions'].includes(s.key)));
    } finally {
      await Role.updateOne({ _id: role._id }, { permissions: original });
      await cache.reload();
    }
  }
});

test('audit: staff without leave.view sees only own requests', async () => {
  const own = await makeLeave({ requesterId: actors.reader._id });
  await makeLeave();
  const response = await read('/leave-requests', actors.reader);
  assert.equal(response.status, 200);
  const data = (await response.json()).data;
  assert.deepEqual(data.map(l => l._id), [String(own._id)]);
  const admin = (await (await read('/leave-requests', actors.school)).json()).data;
  assert.ok(admin.some(l => l._id === String(own._id)));
});

test('audit: private materials visible only to owner and school managers', async () => {
  const other = await Material.create({ schoolId: schools[0]._id, uploadedBy: actors.school._id, title: 'Private audit', isShared: false });
  const own = await Material.create({ schoolId: schools[0]._id, uploadedBy: actors.teacher._id, title: 'Own audit', isShared: false });
  const shared = await Material.create({ schoolId: schools[0]._id, uploadedBy: actors.school._id, title: 'Shared audit', isShared: true });
  for (const actor of [actors.teacher, actors.parent]) {
    const response = await read('/materials', actor);
    assert.equal(response.status, 200);
    const ids = (await response.json()).data.map(m => m._id);
    assert.ok(!ids.includes(String(other._id)));
    assert.ok(ids.includes(String(shared._id)));
    assert.equal(ids.includes(String(own._id)), actor === actors.teacher);
  }
  const managed = (await (await read('/materials', actors.school)).json()).data;
  assert.ok(managed.some(m => m._id === String(other._id)));
});

test('audit: student exam list includes schoolwide exams and respects narrowing query', async () => {
  const exam = await makeExam({ classId: null });
  const data = (await (await read('/exams', students[0])).json()).data;
  assert.ok(data.some(e => e._id === String(exam._id)));
  const foreign = (await (await read(`/exams?classId=${classes[1]._id}`, students[0])).json()).data;
  assert.deepEqual(foreign, []);
});

test('audit: teacher cannot read or edit exams of an unassigned subject', async () => {
  const exam = await makeExam({ subjectId: subjects[1]._id });
  assert.equal((await read(`/exams/${exam._id}`, actors.teacher)).status, 404);
  assert.equal((await write(`/exams/${exam._id}`, actors.teacher, { title: 'Forbidden' }, 'PUT')).status, 404);
});

test('audit: calendar filters class membership and target roles', async () => {
  const Event = require('../src/models/CalendarEvent');
  const events = await Event.create([
    { title: 'Parent class', classId: classes[0]._id, targetRoles: ['PARENT'] },
    { title: 'Other class', classId: classes[1]._id },
    { title: 'Staff only', targetRoles: ['SCHOOL_ADMIN'] },
    { title: 'School event' },
  ].map(e => ({ schoolId: schools[0]._id, createdBy: actors.school._id, startAt: '2026-10-01', endAt: '2026-10-02', ...e })));
  const parent = await User.create({ name: 'Calendar parent', email: 'calendar-parent@test.invalid', role: 'PARENT', schoolId: schools[0]._id, parentOf: [students[0]._id] });
  const result = (await (await read('/calendar', parent)).json()).data.map(e => e._id);
  assert.ok(result.includes(String(events[0]._id)) && result.includes(String(events[3]._id)));
  assert.ok(!result.includes(String(events[1]._id)) && !result.includes(String(events[2]._id)));
  const teacher = (await (await read('/calendar', actors.teacher)).json()).data.map(e => e._id);
  assert.ok(!teacher.includes(String(events[1]._id)));
});

test('audit: class announcements reach linked parents and honor role targeting in notifications', async () => {
  const bus = require('../src/patterns/eventBus');
  let emitted;
  const capture = event => { emitted = event; };
  bus.once('announcement.created', capture);
  try {
    const response = await write('/announcements', actors.teacher, { title: 'Parent only audit', content: 'Parent meeting', classId: classes[0]._id, targetRoles: ['PARENT'] }, 'POST');
    assert.equal(response.status, 201);
    const notice = (await response.json()).data;
    const parent = (await (await read('/announcements', actors.parent)).json()).data;
    assert.ok(parent.some(n => n._id === notice._id));
    const student = (await (await read('/announcements', students[0])).json()).data;
    assert.ok(!student.some(n => n._id === notice._id));
    assert.ok(emitted.recipients.some(u => String(u) === String(actors.parent._id)));
    assert.ok(!emitted.recipients.some(u => String(u) === String(students[0]._id)));
  } finally { bus.removeListener('announcement.created', capture); }
});

test('audit: roster and teaching lookups do not expose private user profiles', async () => {
  await User.updateOne({ _id: students[0]._id }, { address: 'Private audit address', phone: 'Private phone' });
  const roster = (await (await read(`/classes/${classes[0]._id}/students`, actors.teacher)).json()).data;
  assert.ok(roster.some(s => s.code === 'ST0'));
  for (const row of roster) for (const key of ['address', 'phone', 'password', 'googleId', 'parentOf']) assert.equal(row[key], undefined);
  const assignments = (await (await read('/assignments', actors.teacher)).json()).data;
  assert.ok(Array.isArray(assignments) && assignments.length > 0);
  for (const row of assignments) assert.equal(row.teacherId.address, undefined);
});

test('audit: homeroom conduct reads stay within the homeroom class', async () => {
  const Conduct = require('../src/models/ConductRecord');
  const home = await User.create({ name: 'Conduct home', email: 'conduct-home@test.invalid', role: 'HOMEROOM_TEACHER', schoolId: schools[0]._id });
  await Class.updateOne({ _id: classes[0]._id }, { homeroomTeacherId: home._id });
  const records = await Conduct.create([students[0], students[2]].map(s => ({ schoolId: schools[0]._id, studentId: s._id, classId: s.classId, academicYearId: year._id, rating: 'TOT', recordedBy: home._id })));
  const response = await read('/conduct', home);
  assert.equal(response.status, 200);
  const data = (await response.json()).data;
  assert.ok(data.some(r => r._id === String(records[0]._id)));
  assert.ok(!data.some(r => r._id === String(records[1]._id)));
});
test('payment list intersects cluster scope with invoice query', async () => {
  const Payment = require('../src/models/Payment');
  const original = await Role.findOne({ code: 'CLUSTER_ADMIN' }).lean();
  await Role.updateOne({ code: original.code }, { $push: { permissions: { resource: 'fees', actions: ['view'] } } });
  await cache.reload();
  try {
    const invoices = await Promise.all([students[0], students[4]].map(s => FeeInvoice.findOne({ studentId: s._id })));
    for (const invoice of invoices) await Payment.create({ schoolId: invoice.schoolId, studentId: invoice.studentId, invoiceId: invoice._id, amount: 10, recordedBy: actors.global._id });
    const response = await read('/payments', actors.cluster);
    assert.equal(response.status, 200);
    const data = (await response.json()).data;
    assert.equal(data.length, 1);
    assert.equal(String(data[0].schoolId), String(schools[0]._id));
    const foreign = await read(`/payments?invoiceId=${invoices[1]._id}`, actors.cluster);
    assert.equal(foreign.status, 200);
    assert.deepEqual((await foreign.json()).data, []);
  } finally {
    await Role.updateOne({ code: original.code }, { permissions: original.permissions });
    await cache.reload();
  }
});
test('even global admin cannot mix school and class in material, exam, calendar or announcement', async () => {
  const refs = { schoolId: schools[1]._id, classId: classes[0]._id };
  for (const [path, payload] of [
    ['/materials', { title: 'Mixed school', ...refs }],
    ['/exams', { title: 'Mixed school', ...refs }],
    ['/calendar', { title: 'Mixed school', startAt: '2026-10-01', endAt: '2026-10-02', ...refs }],
    ['/announcements', { title: 'Mixed school', content: 'Test', scope: 'CLASS', ...refs }],
  ]) assert.equal((await write(path, actors.global, payload, 'POST')).status, 403, path);
});
test('announcement derives cluster from school instead of accepting foreign cluster injection', async () => {
  const response = await write('/announcements', actors.school, { title: 'Scope notice', content: 'Test', clusterId: schools[2].clusterId }, 'POST');
  assert.equal(response.status, 201);
  const data = (await response.json()).data;
  assert.equal(String(data.schoolId), String(schools[0]._id));
  assert.equal(String(data.clusterId), String(schools[0].clusterId));
});
test('password login rejects a role owned by a different tenant before issuing a token', async () => {
  process.env.ALLOW_PASSWORD_LOGIN = 'true';
  await Role.create({ code: 'LOGIN_WRONG_SCOPE', name: 'Wrong scope', schoolId: schools[1]._id, permissions: [] });
  await cache.reload();
  await User.create({ name: 'Wrong login scope', email: 'wrong-login@test.invalid', schoolId: schools[0]._id, role: 'LOGIN_WRONG_SCOPE', password: await require('bcrypt').hash('Fixture@Test123', 4) });
  const response = await fetch(`${origin}/v1/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'wrong-login@test.invalid', password: 'Fixture@Test123' }) });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).data?.access_token, undefined);
});
test('directory exposes only contact fields and populated users omit password hashes', async () => {
  await User.updateOne({ _id: actors.teacher._id }, { password: 'test-hash-never-return', address: 'Private address', phone: 'Private phone' });
  const response = await read('/users/directory', actors.teacher);
  assert.equal(response.status, 200);
  const users = (await response.json()).data;
  assert.ok(users.length > 0);
  for (const u of users) for (const key of ['password', 'phone', 'address', 'parentOf', 'googleId']) assert.equal(u[key], undefined);
  const populated = await Attendance.findOne({ teacherId: actors.teacher._id }).populate('teacherId');
  assert.equal(populated.teacherId.password, undefined);
});
test('password login still works with password excluded by default', async () => {
  process.env.ALLOW_PASSWORD_LOGIN = 'true';
  const bcrypt = require('bcrypt');
  await User.updateOne({ _id: actors.teacher._id }, { password: await bcrypt.hash('Fixture@Test123', 4) });
  const response = await fetch(`${origin}/v1/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: actors.teacher.email, password: 'Fixture@Test123' }) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.user.password, undefined);
});
test('read-only report role cannot read exam keys or create calendar events', async () => {
  assert.equal((await read('/exams', actors.reader)).status, 403);
  assert.equal((await write('/calendar', actors.reader, { title: 'Forbidden' }, 'POST')).status, 403);
});
test('authentication rejects a custom role from another school', async () => {
  await Role.create({ code: 'WRONG_SCOPE', name: 'Wrong scope', schoolId: schools[1]._id, permissions: [{ resource: 'grades', actions: ['view'] }] });
  await cache.reload();
  const user = await User.create({ name: 'Wrong scope', email: 'wrong-scope@test.invalid', schoolId: schools[0]._id, role: 'WRONG_SCOPE' });
  assert.equal((await read('/grades', user)).status, 403);
});
test('exam read hides answer keys from parents and rejects foreign students', async () => {
  const exam = await makeExam();
  const get = actor => fetch(`${origin}/v1/api/exams/${exam._id}`, { headers: { Authorization: `Bearer ${jwt.sign({ _id: actor._id }, process.env.JWT_SECRET)}` } });
  const parent = await get(actors.parent);
  assert.equal(parent.status, 200);
  assert.ok((await parent.json()).data.questions.every(q => q.correctKey === undefined));
  assert.equal((await get(students[3])).status, 404);
});
test('exam mutation cannot inject foreign class', async () => {
  const exam = await makeExam();
  assert.equal((await write(`/exams/${exam._id}`, actors.school, { classId: classes[2]._id }, 'PUT')).status, 404);
});
test('unassigned teacher cannot grade an attempt', async () => {
  const exam = await makeExam({ classId: classes[1]._id });
  const attempt = await Attempt.create({ schoolId: schools[0]._id, examId: exam._id, studentId: students[2]._id, status: 'SUBMITTED' });
  assert.equal((await write(`/exam-attempts/${attempt._id}/grade`, actors.teacher, { grades: [] }, 'POST')).status, 404);
});
test('concurrent start cannot exceed one attempt', async () => {
  await Attempt.init();
  const exam = await makeExam();
  const responses = await Promise.all([0, 1].map(() => write(`/exams/${exam._id}/attempts`, students[0], {}, 'POST')));
  assert.equal(responses.filter(r => r.status >= 200 && r.status < 300).length, 1);
  assert.equal(await Attempt.countDocuments({ examId: exam._id }), 1);
});
test('submission rejects wrong owner, duplicate questions and hides disabled results', async () => {
  const exam = await makeExam({ showResults: false });
  const attempt = await Attempt.create({ schoolId: schools[0]._id, examId: exam._id, studentId: students[0]._id });
  const answer = { questionId: exam.questions[0]._id, answerKey: 'A' };
  assert.equal((await write(`/exam-attempts/${attempt._id}/submit`, students[1], { answers: [answer] }, 'POST')).status, 403);
  assert.equal((await write(`/exam-attempts/${attempt._id}/submit`, students[0], { answers: [answer, answer] }, 'POST')).status, 400);
  const response = await write(`/exam-attempts/${attempt._id}/submit`, students[0], { answers: [answer] }, 'POST');
  assert.equal(response.status, 200);
  const data = (await response.json()).data;
  assert.equal(data.score, null);
  assert.ok(data.answers.every(a => a.pointsAwarded === undefined && a.isCorrect === undefined));
  assert.equal((await Attempt.findById(attempt._id)).score, 1);
});
test('essay regrade recalculates total without accumulating old awarded points', async () => {
  const exam = await makeExam();
  const attempt = await Attempt.create({ schoolId: schools[0]._id, examId: exam._id, studentId: students[0]._id, status: 'SUBMITTED', answers: [{ questionId: exam.questions[0]._id, answerKey: 'A', isCorrect: true, pointsAwarded: 1 }, { questionId: exam.questions[1]._id, answerText: 'Because', pointsAwarded: 0 }] });
  const grade = { questionId: exam.questions[1]._id, pointsAwarded: 2 };
  for (let i = 0; i < 2; i++) {
    const response = await write(`/exam-attempts/${attempt._id}/grade`, actors.teacher, { grades: [grade] }, 'POST');
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.score, 3);
  }
  assert.equal((await write(`/exam-attempts/${attempt._id}/grade`, actors.teacher, { grades: [{ ...grade, pointsAwarded: 100 }] }, 'POST')).status, 400);
});
