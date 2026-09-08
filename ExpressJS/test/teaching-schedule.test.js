const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'schedule-test-only-secret';
const app = require('../src/app');
const cache = require('../src/services/rolePermissionCache');
const { ROLE_PERMISSIONS } = require('../src/constants/permissions');
const { legacyPermissionsToEntries } = require('../src/constants/permissionCatalog');
const Role = require('../src/models/Role');
const School = require('../src/models/School');
const User = require('../src/models/User');
const Class = require('../src/models/Class');
const Year = require('../src/models/AcademicYear');
const Subject = require('../src/models/Subject');
const Assignment = require('../src/models/TeacherAssignment');
const Timetable = require('../src/models/Timetable');
const Leave = require('../src/models/LeaveRequest');
let mongo, server, origin, school, foreign, year, classes, subject, actors, tables;
const call = async (method, path, actor, body) => {
  const res = await fetch(`${origin}/v1/api${path}`, { method, headers: { Authorization: `Bearer ${jwt.sign({ _id: actor._id }, process.env.JWT_SECRET)}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, ...(await res.json()) };
};
const review = (id, status = 'APPROVED', actor = actors.admin) => call('PATCH', `/leave-requests/${id}/review`, actor, { status });
const calendar = (actor = actors.student, from = '2026-09-07', to = '2026-09-09', extra = '') => call('GET', `/timetables/schedule?fromDate=${from}&toDate=${to}${extra}`, actor);
const absence = async (actor = actors.teacher, from = '2026-09-07', to = from, approve = true) => {
  const res = await call('POST', '/leave-requests', actor, { type: 'TEACHER_ABSENCE', reason: 'Private medical reason', fromDate: from, toDate: to });
  assert.equal(res.status, 201, res.EM);
  if (approve) assert.equal((await review(res.data._id)).status, 200);
  return res.data;
};
const makeup = (absenceId, overrides = {}, actor = actors.teacher) => call('POST', '/leave-requests', actor, {
  type: 'MAKEUP_CLASS', reason: 'Make up lesson', fromDate: '2026-09-08', toDate: '2026-09-08',
  makeup: { absenceId, timetableId: String(tables[0]._id), originalDate: '2026-09-07', originalPeriod: 1, date: '2026-09-08', period: 4, room: 'R1', ...overrides },
});
before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Role.create(Object.entries(ROLE_PERMISSIONS).map(([code, keys]) => ({ code, name: code, permissions: legacyPermissionsToEntries(keys) })));
  await Role.create({ code: 'NO_SCHEDULE', name: 'No schedule', permissions: [] });
  await cache.reload();
  school = await School.create({ name: 'Schedule School', code: 'SCH', subdomain: 'sch' });
  foreign = await School.create({ name: 'Foreign', code: 'FOR', subdomain: 'foreign' });
  year = await Year.create({ schoolId: school._id, name: '2026', startDate: '2026-01-01', endDate: '2026-12-31' });
  classes = await Class.create(['A', 'B', 'C'].map(name => ({ schoolId: school._id, academicYearId: year._id, name, gradeLevel: 10 })));
  subject = await Subject.create({ schoolId: school._id, name: 'Math', code: 'MATH' });
  actors = {};
  for (const [name, role] of Object.entries({ teacher: 'SUBJECT_TEACHER', other: 'SUBJECT_TEACHER', admin: 'SCHOOL_ADMIN', outsider: 'SCHOOL_ADMIN', student: 'STUDENT', peer: 'STUDENT', parent: 'PARENT', reader: 'NO_SCHEDULE' })) {
    actors[name] = await User.create({ name, email: `${name}@schedule.invalid`, role, schoolId: name === 'outsider' ? foreign._id : school._id, classId: name === 'student' ? classes[0]._id : name === 'peer' ? classes[1]._id : null });
  }
  actors.parent.parentOf = [actors.student._id]; await actors.parent.save();
  await Promise.all([Timetable.init(), Leave.init()]);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(async () => {
  await Leave.deleteMany({}); await Timetable.deleteMany({}); await Assignment.deleteMany({});
  await User.updateMany({}, { status: 'ACTIVE' });
  await Assignment.create([
    { teacherId: actors.teacher._id, classId: classes[0]._id },
    { teacherId: actors.other._id, classId: classes[1]._id },
  ].map(a => ({ ...a, schoolId: school._id, subjectId: subject._id, academicYearId: year._id })));
  tables = await Timetable.create([0, 1].map(i => ({ schoolId: school._id, academicYearId: year._id, classId: classes[i]._id, status: 'APPROVED', slots: (i ? [3] : [1, 2]).map(period => ({ dayOfWeek: 1, period, teacherId: (i ? actors.other : actors.teacher)._id, subjectId: subject._id, room: `R${i}` })) })));
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); if (mongo) await mongo.stop(); });

test('approval cancels only dated teacher lessons; pending/rejected requests and weekly template stay intact', async () => {
  const leave = await absence(actors.teacher, '2026-09-07', '2026-09-07', false);
  assert.ok((await calendar()).data.every(r => r.kind === 'REGULAR'));
  assert.equal((await review(leave._id)).status, 200);
  const result = await calendar();
  assert.equal(result.data.length, 2);
  assert.ok(result.data.every(r => r.kind === 'CANCELLED'));
  assert.ok(!JSON.stringify(result).includes('Private medical reason'));
  assert.ok((await calendar(actors.student, '2026-09-14', '2026-09-14')).data.every(r => r.kind === 'REGULAR'));
  assert.equal((await Timetable.findById(tables[0]._id)).slots.length, 2);
  assert.equal((await review(leave._id)).status, 409);
});
test('approved makeup adds a single dated lesson for student and parent with server-owned references', async () => {
  const leave = await absence();
  const res = await makeup(leave._id, { classId: classes[1]._id, teacherId: actors.other._id, subjectId: new mongoose.Types.ObjectId() });
  assert.equal(res.status, 201, res.EM);
  assert.equal(res.data.makeup.classId, String(classes[0]._id));
  assert.equal((await calendar()).data.filter(r => r.kind === 'MAKEUP').length, 0);
  assert.equal((await review(res.data._id)).status, 200);
  for (const actor of [actors.student, actors.parent]) {
    const rows = (await calendar(actor)).data;
    assert.equal(rows.filter(r => r.kind === 'MAKEUP').length, 1);
    assert.equal(rows.find(r => r.kind === 'MAKEUP').subjectId.name, 'Math');
  }
  assert.equal((await calendar(actors.peer)).data.filter(r => r.kind === 'MAKEUP').length, 0);
  assert.equal((await calendar(actors.outsider)).data.length, 0);
});
test('rejection and student absence do not change teacher timetable', async () => {
  const leave = await absence(actors.teacher, '2026-09-07', '2026-09-07', false);
  assert.equal((await review(leave._id, 'REJECTED')).status, 200);
  const student = await call('POST', '/leave-requests', actors.student, { type: 'STUDENT_ABSENCE', reason: 'Sick', fromDate: '2026-09-07', toDate: '2026-09-07' });
  assert.equal(student.status, 201);
  assert.equal((await review(student.data._id)).status, 200);
  assert.ok((await calendar()).data.every(r => r.kind === 'REGULAR'));
});
test('foreign review, wrong teacher source and forbidden schedule reads are denied', async () => {
  const leave = await absence();
  assert.equal((await review(leave._id, 'APPROVED', actors.outsider)).status, 404);
  assert.equal((await makeup(leave._id, {}, actors.other)).status, 409);
  assert.equal((await calendar(actors.reader)).status, 403);
  assert.equal((await calendar(actors.parent, '2026-09-07', '2026-09-09', `&classId=${classes[1]._id}`)).data.length, 0);
  assert.equal((await calendar(actors.teacher, '2026-09-07', '2026-09-09', `&classId=${classes[1]._id}`)).data.length, 0);
});
test('structured dates, integer periods, school year and approved absence are required', async () => {
  const leave = await absence(actors.teacher, '2026-09-07', '2026-09-07', false);
  assert.equal((await makeup(leave._id)).status, 409);
  await review(leave._id);
  for (const fields of [{ date: '2026-02-30' }, { date: '2026-09-07' }, { period: 1.5 }, { originalPeriod: 0 }, { date: '2027-01-01' }, { date: '2026-09-08T00:00:00Z' }, { timetableId: 'oops' }]) {
    assert.equal((await makeup(leave._id, fields)).status, 400, JSON.stringify(fields));
  }
  assert.equal((await call('POST', '/leave-requests', actors.teacher, { type: 'MAKEUP_CLASS', reason: 'Legacy', fromDate: '2026-09-08', toDate: '2026-09-08', makeupProposal: 'Tuesday' })).status, 400);
  assert.equal((await calendar(actors.student, '2026-01-01', '2026-12-31')).status, 400);
});
test('revoked assignment and inactive teacher are rechecked at review', async () => {
  const leave = await absence(); const req = await makeup(leave._id);
  await Assignment.deleteMany({ teacherId: actors.teacher._id });
  assert.equal((await review(req.data._id)).status, 403);
  assert.equal((await Leave.findById(req.data._id)).status, 'PENDING');
});
test('a changed source timetable cannot approve a stale makeup request', async () => {
  const leave = await absence(); const req = await makeup(leave._id);
  await Timetable.updateOne({ _id: tables[0]._id }, { slots: [] });
  assert.equal((await review(req.data._id)).status, 409);
});
test('concurrent approval permits only one makeup for the same original lesson', async () => {
  const leave = await absence(); const a = await makeup(leave._id); const b = await makeup(leave._id, { date: '2026-09-09' });
  const results = await Promise.all([review(a.data._id), review(b.data._id)]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  assert.equal(await Leave.countDocuments({ type: 'MAKEUP_CLASS', status: 'APPROVED' }), 1);
});
test('concurrent different source lessons cannot occupy the same class period', async () => {
  const leave = await absence(); const a = await makeup(leave._id); const b = await makeup(leave._id, { originalPeriod: 2, room: 'R9' });
  assert.deepEqual((await Promise.all([review(a.data._id), review(b.data._id)])).map(r => r.status).sort(), [200, 409]);
});
test('makeup checks recurring teacher, class and normalized room conflicts across classes', async () => {
  const leave = await absence();
  for (const collision of ['teacher', 'class', 'room']) {
    const target = collision === 'class' ? tables[0] : tables[1];
    const slot = { dayOfWeek: 2, period: 4, subjectId: subject._id, teacherId: collision === 'teacher' ? actors.teacher._id : actors.other._id, room: collision === 'room' ? ' r1 ' : 'other' };
    await Timetable.updateOne({ _id: target._id }, { $push: { slots: slot } });
    const req = await makeup(leave._id);
    assert.equal((await review(req.data._id)).status, 409, collision);
    await Timetable.updateOne({ _id: target._id }, { $pull: { slots: { dayOfWeek: 2 } } });
  }
});
test('teacher absence on destination day prevents makeup approval', async () => {
  const leave = await absence(); await absence(actors.teacher, '2026-09-08');
  const req = await makeup(leave._id);
  assert.equal((await review(req.data._id)).status, 409);
});
test('new absence cannot silently remove an approved makeup', async () => {
  const leave = await absence(); const req = await makeup(leave._id); await review(req.data._id);
  const second = await absence(actors.teacher, '2026-09-08', '2026-09-08', false);
  assert.equal((await review(second._id)).status, 409);
  assert.equal((await Leave.findById(second._id)).status, 'PENDING');
});
test('timetable approval rejects conflicts with another class and existing makeups', async () => {
  const leave = await absence(); const req = await makeup(leave._id); await review(req.data._id);
  await Timetable.updateOne({ _id: tables[1]._id }, { status: 'DRAFT', slots: [{ dayOfWeek: 2, period: 4, subjectId: subject._id, teacherId: actors.other._id, room: 'R1' }] });
  assert.equal((await call('PATCH', `/timetables/${tables[1]._id}/approve`, actors.admin, {})).status, 409);
  await Timetable.updateOne({ _id: tables[1]._id }, { slots: [{ dayOfWeek: 1, period: 1, subjectId: subject._id, teacherId: actors.teacher._id }] });
  assert.equal((await call('PATCH', `/timetables/${tables[1]._id}/approve`, actors.admin, {})).status, 409);
});
test('timetable rejects two subjects in one class period and fractional weekdays', async () => {
  const base = { classId: String(classes[0]._id), academicYearId: String(year._id), slots: [{ dayOfWeek: 1, period: 1, subjectId: String(subject._id), teacherId: String(actors.teacher._id) }] };
  assert.equal((await call('POST', '/timetables', actors.admin, { ...base, slots: [...base.slots, { ...base.slots[0], teacherId: String(actors.other._id) }] })).status, 400);
  assert.equal((await call('POST', '/timetables', actors.admin, { ...base, slots: [{ ...base.slots[0], dayOfWeek: 1.5 }] })).status, 400);
});
test('makeup remains visible while weekly template is being revised', async () => {
  const leave = await absence(); const req = await makeup(leave._id); await review(req.data._id);
  const saved = await call('POST', '/timetables', actors.admin, { academicYearId: String(year._id), classId: String(classes[0]._id), slots: [] });
  assert.equal(saved.status, 200, saved.EM);
  assert.equal((await calendar()).data.filter(r => r.kind === 'MAKEUP').length, 1);
});

test('concurrent absence and makeup approvals cannot leave a teacher booked on an approved day off', async () => {
  const source = await absence(); const req = await makeup(source._id);
  const dayOff = await absence(actors.teacher, '2026-09-08', '2026-09-08', false);
  const results = await Promise.all([review(req.data._id), review(dayOff._id)]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
});
test('concurrent weekly timetable and makeup approvals share the same conflict boundary', async () => {
  const source = await absence(); const req = await makeup(source._id);
  await Timetable.updateOne({ _id: tables[1]._id }, { status: 'DRAFT', slots: [{ dayOfWeek: 2, period: 4, subjectId: subject._id, teacherId: actors.other._id, room: 'R1' }] });
  const results = await Promise.all([review(req.data._id), call('PATCH', `/timetables/${tables[1]._id}/approve`, actors.admin, {})]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
});
test('concurrent weekly approvals cannot double-book a teacher across classes', async () => {
  const slots = [{ dayOfWeek: 2, period: 4, subjectId: subject._id, teacherId: actors.teacher._id }];
  await Timetable.updateMany({}, { status: 'DRAFT', slots });
  const results = await Promise.all(tables.map(t => call('PATCH', `/timetables/${t._id}/approve`, actors.admin, {})));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
});
test('inactive teacher cannot approve an already-submitted makeup', async () => {
  const leave = await absence(); const req = await makeup(leave._id);
  await User.updateOne({ _id: actors.teacher._id }, { status: 'INACTIVE' });
  assert.equal((await review(req.data._id)).status, 403);
});
test('approved legacy text-only makeup remains readable but cannot become an inferred schedule', async () => {
  const legacy = await Leave.create({ schoolId: school._id, requesterId: actors.teacher._id, type: 'MAKEUP_CLASS', reason: 'Legacy', fromDate: '2026-09-08', toDate: '2026-09-08', makeupProposal: 'Tuesday period four' });
  assert.equal((await review(legacy._id)).status, 400);
  assert.equal((await review(legacy._id, 'REJECTED')).status, 200);
  assert.equal((await calendar()).data.filter(r => r.kind === 'MAKEUP').length, 0);
});
test('weekly collision rules consider overlapping years but allow disjoint year ranges', async () => {
  await Timetable.updateOne({ _id: tables[1]._id }, { status: 'DRAFT', slots: [{ dayOfWeek: 1, period: 1, subjectId: subject._id, teacherId: actors.teacher._id }] });
  const laterYear = await Year.create({ schoolId: school._id, name: '2027', startDate: '2027-01-01', endDate: '2027-12-31' });
  const laterClass = await Class.create({ schoolId: school._id, academicYearId: laterYear._id, name: '2027-A', gradeLevel: 10 });
  await Timetable.updateOne({ _id: tables[1]._id }, { academicYearId: laterYear._id, classId: laterClass._id });
  assert.equal((await call('PATCH', `/timetables/${tables[1]._id}/approve`, actors.admin, {})).status, 200);
});
test('an absent teacher frees the dated class/room slot while the recurring template stays reserved', async () => {
  const source = await absence();
  await Timetable.updateOne({ _id: tables[1]._id }, { $push: { slots: { dayOfWeek: 2, period: 4, subjectId: subject._id, teacherId: actors.other._id, room: 'R1' } } });
  await absence(actors.other, '2026-09-08');
  const req = await makeup(source._id);
  assert.equal((await review(req.data._id)).status, 200);
});
test('school and year filters cannot override parent and teacher scoping on makeup rows', async () => {
  const source = await absence(); const req = await makeup(source._id); await review(req.data._id);
  for (const actor of [actors.parent, actors.teacher]) {
    const foreign = await calendar(actor, '2026-09-08', '2026-09-08', `&schoolId=${actors.outsider.schoolId}`);
    assert.equal(foreign.data.length, 0);
    const otherClass = await calendar(actor, '2026-09-08', '2026-09-08', `&classId=${classes[1]._id}`);
    assert.equal(otherClass.data.length, 0);
  }
  const teacherRows = await calendar(actors.teacher, '2026-09-08', '2026-09-08');
  assert.equal(teacherRows.status, 200);
  assert.equal(teacherRows.data.length, 1);
  assert.equal(teacherRows.data[0].teacherId.email, undefined);
});

test('operator cancellation preserves approval history, frees slot and allows a replacement request', async () => {
  const source = await absence(); const req = await makeup(source._id); await review(req.data._id);
  const cancelled = await call('PATCH', `/leave-requests/${req.data._id}/cancel-makeup`, actors.admin, { note: 'Room unavailable' });
  assert.equal(cancelled.status, 200, cancelled.EM);
  assert.equal(cancelled.data.status, 'CANCELLED');
  assert.equal(cancelled.data.reviewedBy, String(actors.admin._id));
  assert.equal(cancelled.data.cancelledBy, String(actors.admin._id));
  assert.equal(cancelled.data.cancellationNote, 'Room unavailable');
  assert.equal((await calendar()).data.filter(r => r.kind === 'MAKEUP').length, 0);
  assert.equal((await review(req.data._id)).status, 409);
  const replacement = await makeup(source._id, { date: '2026-09-09' });
  assert.equal((await review(replacement.data._id)).status, 200);
  const dayOff = await absence(actors.teacher, '2026-09-08');
  assert.ok(dayOff._id);
});
test('cancellation requires reviewer permissions, tenant scope, an approved makeup and a reason', async () => {
  const source = await absence(); const req = await makeup(source._id); await review(req.data._id);
  const path = `/leave-requests/${req.data._id}/cancel-makeup`;
  assert.equal((await call('PATCH', path, actors.teacher, { note: 'No' })).status, 403);
  assert.equal((await call('PATCH', path, actors.outsider, { note: 'No' })).status, 404);
  assert.equal((await call('PATCH', path, actors.admin, { note: ' ' })).status, 400);
  assert.equal((await call('PATCH', `/leave-requests/${source._id}/cancel-makeup`, actors.admin, { note: 'No' })).status, 409);
  const results = await Promise.all([call('PATCH', path, actors.admin, { note: 'Changed' }), call('PATCH', path, actors.admin, { note: 'Changed again' })]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
});
test('a successfully approved weekly timetable cannot be approved a second time', async () => {
  await Timetable.updateOne({ _id: tables[0]._id }, { status: 'DRAFT' });
  assert.equal((await call('PATCH', `/timetables/${tables[0]._id}/approve`, actors.admin, {})).status, 200);
  assert.equal((await call('PATCH', `/timetables/${tables[0]._id}/approve`, actors.admin, {})).status, 409);
});
