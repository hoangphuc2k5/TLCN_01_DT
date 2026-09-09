const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test'; process.env.JWT_SECRET = 'appointment-test-secret';
const app = require('../src/app');
const cache = require('../src/services/rolePermissionCache');
const { ROLE_PERMISSIONS } = require('../src/constants/permissions');
const { legacyPermissionsToEntries, DEFAULT_ROLE_LEVELS } = require('../src/constants/permissionCatalog');
const Role = require('../src/models/Role');
const School = require('../src/models/School');
const User = require('../src/models/User');
const Year = require('../src/models/AcademicYear');
const TeacherAppointment = require('../src/models/TeacherAppointment');
const SatisfactionSurvey = require('../src/models/SatisfactionSurvey');

let mongo; let server; let origin; let school; let year; let student; let parent; let parent2; let teacher; let admin;
const request = async (method, path, actor, body) => {
  const headers = { 'Content-Type': 'application/json' };
  if (actor) headers.Authorization = `Bearer ${jwt.sign({ _id: actor._id }, process.env.JWT_SECRET)}`;
  const response = await fetch(`${origin}/v1/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, ...(await response.json()) };
};

before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); await mongoose.connect(mongo.getUri());
  await Role.create(Object.entries(ROLE_PERMISSIONS).map(([code, keys]) => ({ code, name: code, level: DEFAULT_ROLE_LEVELS[code], permissions: legacyPermissionsToEntries(keys) })));
  await cache.reload();
  school = await School.create({ name: 'Appointment School', code: 'APS', subdomain: 'aps' });
  year = await Year.create({ schoolId: school._id, name: '2026', startDate: '2026-08-01', endDate: '2027-06-30' });
  teacher = await User.create({ name: 'teacher', email: 'teacher@app.invalid', role: 'SUBJECT_TEACHER', schoolId: school._id });
  admin = await User.create({ name: 'admin', email: 'admin@app.invalid', role: 'SCHOOL_ADMIN', schoolId: school._id });
  student = await User.create({ name: 'student', email: 'student@app.invalid', role: 'STUDENT', schoolId: school._id });
  parent = await User.create({ name: 'parent', email: 'parent@app.invalid', role: 'PARENT', schoolId: school._id, parentOf: [student._id] });
  parent2 = await User.create({ name: 'parent2', email: 'parent2@app.invalid', role: 'PARENT', schoolId: school._id, parentOf: [student._id] });
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); await mongo.stop(); });

test('parent books a teacher, teacher completes it and parent submits one survey', async () => {
  const scheduledAt = new Date(Date.now() + 3600000).toISOString();
  const created = await request('POST', '/appointments', parent, { studentId: student._id, teacherId: teacher._id, scheduledAt, durationMinutes: 30, reason: 'Discuss progress' });
  assert.equal(created.status, 201);
  const deniedStudent = await request('GET', '/appointments', student);
  assert.equal(deniedStudent.status, 403);
  const visible = await request('GET', '/appointments', teacher);
  assert.equal(visible.status, 200); assert.equal(visible.data.length, 1);
  assert.equal((await request('PATCH', `/appointments/${created.data._id}/review`, teacher, { status: 'CONFIRMED', meetingUrl: 'https://meet.invalid/1' })).status, 200);
  assert.equal((await request('PATCH', `/appointments/${created.data._id}/review`, teacher, { status: 'COMPLETED' })).status, 200);
  const survey = await request('POST', `/appointments/${created.data._id}/survey`, parent, { rating: 5, comment: 'Very useful' });
  assert.equal(survey.status, 201); assert.equal(survey.data.rating, 5);
  assert.equal((await request('POST', `/appointments/${created.data._id}/survey`, parent, { rating: 4 })).status, 409);
  assert.equal(await SatisfactionSurvey.countDocuments({ appointmentId: created.data._id }), 1);
});

test('scope, overlap and lifecycle rules prevent invalid appointments', async () => {
  const scheduledAt = new Date(Date.now() + 7200000).toISOString();
  const first = await request('POST', '/appointments', parent, { studentId: student._id, teacherId: teacher._id, scheduledAt, reason: 'First' });
  assert.equal(first.status, 201);
  const overlap = await request('POST', '/appointments', parent2, { studentId: student._id, teacherId: teacher._id, scheduledAt: new Date(new Date(scheduledAt).getTime() + 15 * 60000).toISOString(), reason: 'Overlap' });
  assert.equal(overlap.status, 409);
  const futureTooSoon = await request('POST', '/appointments', parent, { studentId: student._id, teacherId: teacher._id, scheduledAt: new Date(Date.now() - 1000).toISOString(), reason: 'Past' });
  assert.equal(futureTooSoon.status, 400);
  assert.equal((await request('PATCH', `/appointments/${first.data._id}/review`, admin, { status: 'DECLINED' })).status, 200);
  assert.equal((await request('PATCH', `/appointments/${first.data._id}/cancel`, parent)).status, 409);
  const foreignStudent = await User.create({ name: 'foreign', email: 'foreign@app.invalid', role: 'STUDENT', schoolId: school._id });
  assert.equal((await request('POST', '/appointments', parent, { studentId: foreignStudent._id, teacherId: teacher._id, scheduledAt: new Date(Date.now() + 3600000).toISOString(), reason: 'Foreign' })).status, 403);
  assert.equal(await TeacherAppointment.countDocuments({}), 2);
});
