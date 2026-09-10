const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'homework-test-secret';
const app = require('../src/app');
const cache = require('../src/services/rolePermissionCache');
const { ROLE_PERMISSIONS } = require('../src/constants/permissions');
const { legacyPermissionsToEntries, DEFAULT_ROLE_LEVELS } = require('../src/constants/permissionCatalog');
const Role = require('../src/models/Role');
const School = require('../src/models/School');
const User = require('../src/models/User');
const Class = require('../src/models/Class');
const Year = require('../src/models/AcademicYear');
const Subject = require('../src/models/Subject');
const TeacherAssignment = require('../src/models/TeacherAssignment');
const Homework = require('../src/models/Homework');
const Submission = require('../src/models/HomeworkSubmission');

let mongo, server, origin, school, foreignSchool, year, foreignYear, cls, foreignClass, subject, actors;
const id = () => new mongoose.Types.ObjectId();
const request = async (method, path, actor, body) => {
  const response = await fetch(`${origin}/v1/api${path}`, {
    method,
    headers: { Authorization: `Bearer ${jwt.sign({ _id: actor._id }, process.env.JWT_SECRET)}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, ...(await response.json()) };
};
const createPayload = (extra = {}) => ({ title: 'Algebra practice', instructions: 'Solve all questions and explain your method.', classId: cls._id, subjectId: subject._id, academicYearId: year._id, dueAt: '2030-09-10T17:00:00.000Z', availableFrom: '2020-09-01T00:00:00.000Z', maxScore: 10, ...extra });
const create = (actor = actors.teacher, extra = {}) => request('POST', '/homeworks', actor, createPayload(extra));
const publish = id => request('PATCH', `/homeworks/${id}/publish`, actors.teacher);

before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Role.create(Object.entries(ROLE_PERMISSIONS).map(([code, keys]) => ({ code, name: code, level: DEFAULT_ROLE_LEVELS[code], permissions: legacyPermissionsToEntries(keys) })));
  await cache.reload();
  school = await School.create({ name: 'Homework School', code: 'HWS', subdomain: 'hws' });
  foreignSchool = await School.create({ name: 'Foreign School', code: 'HWF', subdomain: 'hwf' });
  year = await Year.create({ schoolId: school._id, name: '2030', startDate: '2020-08-01', endDate: '2031-06-30' });
  foreignYear = await Year.create({ schoolId: foreignSchool._id, name: '2030', startDate: '2020-08-01', endDate: '2031-06-30' });
  cls = await Class.create({ schoolId: school._id, academicYearId: year._id, name: '10A1', gradeLevel: 10 });
  foreignClass = await Class.create({ schoolId: foreignSchool._id, academicYearId: foreignYear._id, name: '10F1', gradeLevel: 10 });
  subject = await Subject.create({ schoolId: school._id, name: 'Mathematics', code: 'MATH' });
  actors = {};
  for (const [name, role, extra] of [
    ['teacher', 'SUBJECT_TEACHER', {}], ['otherTeacher', 'SUBJECT_TEACHER', {}], ['admin', 'SCHOOL_ADMIN', {}],
    ['academic', 'ACADEMIC_AFFAIRS', {}], ['student', 'STUDENT', { classId: cls._id }], ['peer', 'STUDENT', { classId: cls._id }],
    ['foreignStudent', 'STUDENT', { schoolId: foreignSchool._id, classId: foreignClass._id }], ['parent', 'PARENT', {}], ['reader', 'LIBRARIAN', {}],
  ]) actors[name] = await User.create({ name, email: `${name}@homework.invalid`, role, schoolId: extra.schoolId || school._id, ...extra });
  actors.parent.parentOf = [actors.student._id]; await actors.parent.save();
  await TeacherAssignment.create({ schoolId: school._id, teacherId: actors.teacher._id, classId: cls._id, subjectId: subject._id, academicYearId: year._id });
  await Promise.all([Homework.init(), Submission.init()]);
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); origin = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(async () => { await Homework.deleteMany({}); await Submission.deleteMany({}); });
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); if (mongo) await mongo.stop(); });

test('teacher creates draft, updates it, publishes it and students see only published assignments', async () => {
  const draft = await create(); assert.equal(draft.status, 201, draft.EM);
  assert.equal((await request('GET', '/homeworks', actors.student)).data.length, 0);
  const updated = await request('PUT', `/homeworks/${draft.data._id}`, actors.teacher, { instructions: 'Updated instructions' });
  assert.equal(updated.status, 200, updated.EM);
  assert.equal((await publish(draft.data._id)).status, 200);
  const list = await request('GET', '/homeworks', actors.student);
  assert.equal(list.status, 200); assert.equal(list.data.length, 1); assert.equal(list.data[0].instructions, 'Updated instructions');
});
test('assignment creation enforces teacher assignment, tenant references and ownership', async () => {
  assert.equal((await create(actors.otherTeacher)).status, 403);
  assert.equal((await create(actors.teacher, { classId: foreignClass._id, academicYearId: foreignYear._id })).status, 403);
  assert.equal((await create(actors.teacher, { dueAt: '2020-08-01T00:00:00.000Z' })).status, 400);
  assert.equal((await create(actors.student)).status, 403);
  assert.equal((await request('GET', '/homeworks', actors.reader)).status, 403);
});
test('students submit once per assignment, can replace an ungraded submission before deadline and parent can inspect child status', async () => {
  const assignment = await create(); await publish(assignment.data._id);
  assert.equal((await request('POST', `/homeworks/${assignment.data._id}/submissions`, actors.student, { answerText: 'First answer' })).status, 201);
  assert.equal((await request('POST', `/homeworks/${assignment.data._id}/submissions`, actors.student, { answerText: 'Revised answer' })).status, 201);
  assert.equal((await request('POST', `/homeworks/${assignment.data._id}/submissions`, actors.parent, { answerText: 'Wrong role' })).status, 403);
  const parentList = await request('GET', '/homeworks', actors.parent); assert.equal(parentList.status, 200); assert.equal(parentList.data[0].submission.status, 'SUBMITTED');
  const submissions = await request('GET', `/homeworks/${assignment.data._id}/submissions`, actors.parent); assert.equal(submissions.status, 200); assert.equal(submissions.data[0].studentId._id, String(actors.student._id)); assert.equal(submissions.data[0].answerText, 'Revised answer');
});
test('teacher grades submitted work once, score is bounded and student sees feedback', async () => {
  const assignment = await create(); await publish(assignment.data._id);
  await request('POST', `/homeworks/${assignment.data._id}/submissions`, actors.student, { answerText: 'Answer' });
  const submissions = await request('GET', `/homeworks/${assignment.data._id}/submissions`, actors.teacher); const submissionId = submissions.data[0]._id;
  assert.equal((await request('PATCH', `/assignment-submissions/${submissionId}/grade`, actors.teacher, { score: 11 })).status, 400);
  const graded = await request('PATCH', `/assignment-submissions/${submissionId}/grade`, actors.teacher, { score: 8.5, feedback: 'Good reasoning' }); assert.equal(graded.status, 200, graded.EM);
  assert.equal((await request('PATCH', `/assignment-submissions/${submissionId}/grade`, actors.teacher, { score: 9 })).status, 409);
  const list = await request('GET', '/homeworks', actors.student); assert.equal(list.data[0].submission.score, 8.5); assert.equal(list.data[0].submission.feedback, 'Good reasoning');
});
test('students cannot access another class or school and teachers cannot grade another teacher assignment', async () => {
  const assignment = await create(); await publish(assignment.data._id);
  assert.equal((await request('GET', `/homeworks/${assignment.data._id}`, actors.foreignStudent)).status, 404);
  assert.equal((await request('GET', `/homeworks/${assignment.data._id}`, actors.foreignStudent)).status, 404);
  assert.equal((await request('GET', `/homeworks/${assignment.data._id}/submissions`, actors.otherTeacher)).status, 404);
  assert.equal((await request('GET', '/homeworks', actors.student, undefined)).status, 200);
});
test('late submission follows allowLate and lateUntil policy', async () => {
  const assignment = await create(actors.teacher, { availableFrom: '2020-08-01T00:00:00.000Z', dueAt: '2020-08-02T00:00:00.000Z' }); await publish(assignment.data._id);
  assert.equal((await request('POST', `/homeworks/${assignment.data._id}/submissions`, actors.student, { answerText: 'Expired' })).status, 400);
  const open = await create(actors.teacher, { availableFrom: '2020-08-01T00:00:00.000Z', dueAt: '2020-08-02T00:00:00.000Z', allowLate: true, lateUntil: '2020-08-03T00:00:00.000Z' });
  assert.equal((await publish(open.data._id)).status, 200);
  assert.equal((await request('POST', `/homeworks/${open.data._id}/submissions`, actors.student, { answerText: 'Still expired' })).status, 400);
});
test('closing prevents new submissions while preserving existing work', async () => {
  const assignment = await create(); await publish(assignment.data._id);
  await request('POST', `/homeworks/${assignment.data._id}/submissions`, actors.student, { answerText: 'Answer' });
  assert.equal((await request('PATCH', `/homeworks/${assignment.data._id}/close`, actors.teacher)).status, 200);
  assert.equal((await request('POST', `/homeworks/${assignment.data._id}/submissions`, actors.peer, { answerText: 'Peer answer' })).status, 400);
  assert.equal((await request('GET', `/homeworks/${assignment.data._id}/submissions`, actors.teacher)).data.length, 1);
});
