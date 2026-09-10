const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const School = require('../src/models/School');
const User = require('../src/models/User');
const Class = require('../src/models/Class');
const Year = require('../src/models/AcademicYear');
const Subject = require('../src/models/Subject');
const Grade = require('../src/models/Grade');
const transfers = require('../src/services/studentTransferService');
const grades = require('../src/services/gradeService');
let mongo; let school; let year; let source; let target; let student; let actor; let subject;
before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  school = await School.create({ name: 'Transfer school', code: 'TRANSFER', subdomain: 'transfer' });
  year = await Year.create({ schoolId: school._id, name: '2026-2027', startDate: '2026-08-01', endDate: '2027-06-30' });
  [source, target] = await Class.create(['10A', '10B'].map(name => ({ name, schoolId: school._id, academicYearId: year._id, gradeLevel: 10 })));
  actor = await User.create({ name: 'Admin', email: 'transfer-admin@test.invalid', role: 'SUPER_ADMIN' });
  student = await User.create({ name: 'Student', email: 'transfer-student@test.invalid', role: 'STUDENT', schoolId: school._id, classId: source._id });
  subject = await Subject.create({ name: 'Math', code: 'MATH', schoolId: school._id });
  await Grade.init();
  await Grade.create([1, 2].map(semester => ({ schoolId: school._id, academicYearId: year._id, classId: source._id, studentId: student._id, teacherId: actor._id, subjectId: subject._id, semester, scores: [{ type: 'MIDTERM', score: semester + 6 }], average: semester + 6 })));
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
});
after(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); });
const update = () => ({ schoolId: school._id, classId: target._id });
const metadata = { transferSemester: 2, transferReason: 'Parent request' };
test('rejects missing metadata and full destinations without moving grades or student', async () => {
  await assert.rejects(transfers.transfer(actor, student, update(), {}), error => error.statusCode === 400);
  await Class.updateOne({ _id: target._id }, { maxStudents: 0 });
  await assert.rejects(transfers.transfer(actor, student, update(), metadata), error => error.statusCode === 409);
  assert.equal(String((await User.findById(student._id)).classId), String(source._id));
  assert.equal(await Grade.countDocuments({ classId: source._id }), 2);
  await Class.updateOne({ _id: target._id }, { maxStudents: 45 });
});
test('carries selected semester atomically and preserves grade snapshots and class history', async () => {
  const moved = await transfers.transfer(actor, student, update(), metadata);
  assert.equal(String(moved.classId), String(target._id));
  assert.equal(moved.classHistory.length, 1);
  assert.equal(moved.classHistory[0].fromClassName, '10A');
  assert.equal(moved.classHistory[0].reason, metadata.transferReason);
  const first = await Grade.findOne({ semester: 1 });
  const second = await Grade.findOne({ semester: 2 });
  assert.equal(String(first.classId), String(source._id));
  assert.equal(String(second.classId), String(target._id));
  assert.equal(second.transferHistory[0].scores[0].score, 8);
  assert.equal(second.transferHistory[0].average, 8);
  assert.equal(await Grade.countDocuments(), 2);
  await assert.rejects(transfers.transfer(actor, student, update(), metadata), error => error.statusCode === 409);
});
test('allows historical corrections and receiving-class edits without duplicating grades', async () => {
  const base = { academicYearId: year._id, subjectId: subject._id, studentId: student._id, scores: [{ type: 'MIDTERM', score: 9 }] };
  await grades.upsertGrade(actor, { ...base, classId: source._id, semester: 1 });
  const current = await grades.upsertGrade(actor, { ...base, classId: target._id, semester: 2 });
  assert.equal(current.average, 9);
  assert.equal(current.transferHistory[0].scores[0].score, 8);
  await assert.rejects(grades.upsertGrade(actor, { ...base, classId: source._id, semester: 2 }), error => error.statusCode === 409);
  assert.equal(await Grade.countDocuments(), 2);
});
test('old and new teachers can only change grades in their assigned classes', async () => {
  const teachers = await User.create(['old', 'new'].map(name => ({ name, email: `${name}-teacher@test.invalid`, role: 'SUBJECT_TEACHER', schoolId: school._id })));
  await require('../src/models/TeacherAssignment').create(teachers.map((teacher, index) => ({ teacherId: teacher._id, schoolId: school._id, academicYearId: year._id, classId: [source, target][index]._id, subjectId: subject._id })));
  const historical = await Grade.findOne({ semester: 1 });
  const current = await Grade.findOne({ semester: 2 });
  await grades.addScore(teachers[0], historical._id, { type: 'MIDTERM', score: 8 });
  await grades.addScore(teachers[1], current._id, { type: 'MIDTERM', score: 8 });
  await assert.rejects(grades.addScore(teachers[0], current._id, { type: 'MIDTERM', score: 10 }), error => error.statusCode === 403);
  await assert.rejects(grades.addScore(teachers[1], historical._id, { type: 'MIDTERM', score: 10 }), error => error.statusCode === 403);
});
test('serializes concurrent score appends without losing either score', async () => {
  const grade = await Grade.findOne({ semester: 2 });
  const count = grade.scores.length;
  await Promise.all([7, 8].map(score => grades.addScore(actor, grade._id, { type: 'MIDTERM', score })));
  assert.equal((await Grade.findById(grade._id)).scores.length, count + 2);
});
test('serializes a new grade with transfer and never leaves the receiving semester in the old class', async () => {
  const other = await Subject.create({ name: 'Physics', code: 'PHYS', schoolId: school._id });
  const current = await User.findById(student._id);
  const results = await Promise.allSettled([
    transfers.transfer(actor, current, { schoolId: school._id, classId: source._id }, metadata),
    grades.upsertGrade(actor, { academicYearId: year._id, classId: target._id, subjectId: other._id, studentId: student._id, semester: 2, scores: [{ type: 'MIDTERM', score: 7 }] }),
  ]);
  assert.equal(results[0].status, 'fulfilled');
  if (results[1].status === 'rejected') assert.equal(results[1].reason.statusCode, 409);
  assert.equal(await Grade.countDocuments({ studentId: student._id, semester: 2, classId: target._id }), 0);
});
