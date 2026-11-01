const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { models, services } = require('../../config/container');
const service = services['school-transfer'];
let mongo, from, to, other, source, target, fromAdmin, toAdmin, stranger, student, grade;
const fails = status => error => error.statusCode === status;
const payload = () => ({ studentId: student._id, toSchoolId: to._id, reason: 'Gia đình chuyển nơi ở', requestedDate: '2026-11-01' });
const freshStudent = async () => models.user.create({ name: 'Student', email: `${new mongoose.Types.ObjectId()}@test.invalid`, role: 'STUDENT', schoolId: from._id, clusterId: from.clusterId, classId: source._id });
before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  [from, to, other] = await models.school.create(['FROM', 'TO', 'OTHER'].map(code => ({ name: code, code, subdomain: code.toLowerCase(), clusterId: new mongoose.Types.ObjectId() })));
  const years = await models['academic-year'].create([from, to].map(s => ({ schoolId: s._id, name: '2026-2027', startDate: '2026-08-01', endDate: '2027-06-30' })));
  [source, target] = await models.class.create([from, to].map((s, i) => ({ schoolId: s._id, academicYearId: years[i]._id, name: '10A', gradeLevel: 10 })));
  [fromAdmin, toAdmin, stranger] = await models.user.create([from, to, other].map(s => ({ name: s.name, email: `${s.code}@test.invalid`, role: 'SCHOOL_ADMIN', schoolId: s._id, clusterId: s.clusterId })));
  student = await freshStudent();
  const subject = await models.subject.create({ schoolId: from._id, name: 'Math', code: 'MATH' });
  grade = await models.grade.create({ schoolId: from._id, studentId: student._id, academicYearId: years[0]._id, classId: source._id, subjectId: subject._id, teacherId: fromAdmin._id, semester: 1, scores: [{ type: 'MIDTERM', score: 8 }], average: 8 });
  await Promise.all(Object.values(models).map(model => model.init()));
});
after(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); });
test('validates request and limits creation to source administrators', async () => {
  await assert.rejects(service.create(toAdmin, payload()), fails(403));
  await assert.rejects(service.create(student, payload()), fails(403));
  await assert.rejects(service.create(fromAdmin, { ...payload(), reason: ' ' }), fails(400));
  await assert.rejects(service.create(fromAdmin, { ...payload(), toSchoolId: from._id }), fails(400));
  await assert.rejects(service.create(fromAdmin, { ...payload(), requestedDate: 'bad' }), fails(400));
});
test('deduplicates concurrent requests and scopes visibility to the two schools', async () => {
  const results = await Promise.allSettled([service.create(fromAdmin, payload()), service.create(fromAdmin, payload())]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.statusCode, 409);
  const request = results.find(r => r.status === 'fulfilled').value;
  assert.equal((await service.list(stranger)).length, 0);
  assert.equal((await service.list(toAdmin)).length, 1);
  await assert.rejects(service.detail(stranger, request._id), fails(403));
  await assert.rejects(service.decide(toAdmin, request._id, { action: 'approve' }), fails(403));
  await assert.rejects(service.decide(toAdmin, request._id, { action: 'accept', classId: target._id }), fails(409));
  assert.equal((await service.list({ role: 'CLUSTER_ADMIN', clusterId: from.clusterId })).length, 1);
});
test('source approval releases academic snapshot without moving student', async () => {
  const request = await models['school-transfer'].findOne({ studentId: student._id, open: true });
  await service.decide(fromAdmin, request._id, { action: 'approve' });
  const detail = await service.detail(toAdmin, request._id);
  assert.equal(detail.status, 'APPROVED');
  assert.equal(detail.handover.grades[0].average, 8);
  assert.equal(detail.handover.password, undefined);
  assert.equal(String((await models.user.findById(student._id)).schoolId), String(from._id));
  await assert.rejects(service.decide(fromAdmin, request._id, { action: 'approve' }), fails(409));
  await assert.rejects(service.decide(fromAdmin, request._id, { action: 'accept', classId: target._id }), fails(403));
});
test('invalid classes and full destinations roll back acceptance', async () => {
  const request = await models['school-transfer'].findOne({ studentId: student._id, open: true });
  await assert.rejects(service.decide(toAdmin, request._id, { action: 'accept', classId: source._id }), fails(400));
  await models.class.updateOne({ _id: target._id }, { maxStudents: 0 });
  await assert.rejects(service.decide(toAdmin, request._id, { action: 'accept', classId: target._id }), fails(409));
  assert.equal((await models['school-transfer'].findById(request._id)).status, 'APPROVED');
  assert.equal(String((await models.user.findById(student._id)).schoolId), String(from._id));
  await models.class.updateOne({ _id: target._id }, { maxStudents: 45, gradeLevel: 11 });
  await assert.rejects(service.decide(toAdmin, request._id, { action: 'accept', classId: target._id }), fails(400));
  await models.class.updateOne({ _id: target._id }, { gradeLevel: 10 });
});
test('accepts once, refreshes snapshot, preserves old records and parent links, revokes sessions', async () => {
  const request = await models['school-transfer'].findOne({ studentId: student._id, open: true });
  const parent = await models.user.create({ name: 'Parent', email: 'parent@test.invalid', role: 'PARENT', schoolId: from._id, parentOf: [student._id] });
  await models.grade.updateOne({ _id: grade._id }, { average: 9 });
  const results = await Promise.allSettled([1, 2].map(() => service.decide(toAdmin, request._id, { action: 'accept', classId: target._id })));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.statusCode, 409);
  const moved = await models.user.findById(student._id).select('+security');
  assert.equal(String(moved.schoolId), String(to._id));
  assert.equal(String(moved.clusterId), String(to.clusterId));
  assert.equal(String(moved.classId), String(target._id));
  assert.equal(moved.security.sessionVersion, 1);
  assert.equal(String((await models.grade.findById(grade._id)).schoolId), String(from._id));
  assert.equal((await service.detail(toAdmin, request._id)).handover.grades[0].average, 9);
  assert.equal(String((await models.user.findById(parent._id)).parentOf[0]), String(student._id));
});
test('source cancels stale requests; destination rejects only after approval', async () => {
  student = await freshStudent();
  let request = await service.create(fromAdmin, payload());
  await assert.rejects(service.decide(toAdmin, request._id, { action: 'reject', note: 'No' }), fails(403));
  await models.user.updateOne({ _id: student._id }, { classId: null });
  await assert.rejects(service.decide(fromAdmin, request._id, { action: 'approve' }), fails(409));
  await service.decide(fromAdmin, request._id, { action: 'cancel', note: 'Lớp thay đổi' });
  await models.user.updateOne({ _id: student._id }, { classId: source._id });
  request = await service.create(fromAdmin, payload());
  await service.decide(fromAdmin, request._id, { action: 'approve' });
  await assert.rejects(service.decide(toAdmin, request._id, { action: 'reject', note: '' }), fails(400));
  await service.decide(toAdmin, request._id, { action: 'reject', note: 'Không tiếp nhận' });
  assert.equal((await service.detail(fromAdmin, request._id)).status, 'REJECTED');
  assert.equal(String((await models.user.findById(student._id)).schoolId), String(from._id));
});
test('serializes competing transfers against the last class place', async () => {
  const requests = [];
  for (let i = 0; i < 2; i++) {
    student = await freshStudent();
    const request = await service.create(fromAdmin, payload());
    await service.decide(fromAdmin, request._id, { action: 'approve' });
    requests.push(request);
  }
  await models.class.updateOne({ _id: target._id }, { maxStudents: 2 });
  const results = await Promise.allSettled(requests.map(r => service.decide(toAdmin, r._id, { action: 'accept', classId: target._id })));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.statusCode, 409);
  assert.equal(await models.user.countDocuments({ classId: target._id, role: 'STUDENT' }), 2);
});
