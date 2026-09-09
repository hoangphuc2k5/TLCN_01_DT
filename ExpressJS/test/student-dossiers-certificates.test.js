const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

Object.assign(process.env, {
  NODE_ENV: 'test', JWT_SECRET: 'student-documents-test', FILE_STORAGE_DRIVER: 'local',
  FILE_MAX_BYTES: '100000', FILE_DEFAULT_QUOTA_BYTES: '1000000',
});
const root = path.join(os.tmpdir(), `student-documents-${process.pid}`);
process.env.FILE_LOCAL_ROOT = root;
const app = require('../src/app');
const cache = require('../src/services/rolePermissionCache');
const { ROLE_PERMISSIONS } = require('../src/constants/permissions');
const { legacyPermissionsToEntries, DEFAULT_ROLE_LEVELS } = require('../src/constants/permissionCatalog');
const Role = require('../src/models/Role'); const School = require('../src/models/School');
const Year = require('../src/models/AcademicYear'); const Class = require('../src/models/Class');
const Subject = require('../src/models/Subject'); const User = require('../src/models/User');
const Grade = require('../src/models/Grade'); const StudentDocument = require('../src/models/StudentDocument');
const FileAsset = require('../src/models/FileAsset');

let mongo; let server; let origin; let school; let student; let parent; let admin; let foreign;
const pdf = Buffer.from('%PDF-1.4\nstudent dossier\n%%EOF');
const request = async (method, route, actor, body) => {
  const headers = {};
  if (actor) headers.Authorization = `Bearer ${jwt.sign({ _id: actor._id }, process.env.JWT_SECRET)}`;
  const response = await fetch(`${origin}/v1/api${route}`, { method, headers, body });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: response.status, headers: response.headers, data };
};
const upload = async (actor, target = student) => {
  const form = new FormData(); form.set('studentId', String(target._id)); form.set('documentType', 'TRANSCRIPT'); form.set('title', 'Official transcript');
  form.set('file', new Blob([pdf], { type: 'application/pdf' }), 'transcript.pdf');
  return request('POST', '/student-documents/upload', actor, form);
};

before(async () => {
  await fs.rm(root, { recursive: true, force: true });
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); await mongoose.connect(mongo.getUri());
  await Role.create(Object.entries(ROLE_PERMISSIONS).map(([code, keys]) => ({ code, name: code, level: DEFAULT_ROLE_LEVELS[code], permissions: legacyPermissionsToEntries(keys) })));
  await cache.reload();
  school = await School.create({ name: 'Dossier School', code: 'DSS', subdomain: 'dss' });
  const year = await Year.create({ schoolId: school._id, name: '2026', startDate: '2026-08-01', endDate: '2027-06-30' });
  const cls = await Class.create({ schoolId: school._id, academicYearId: year._id, name: '10A', gradeLevel: 10 });
  const subject = await Subject.create({ schoolId: school._id, name: 'Mathematics', code: 'MATH' });
  admin = await User.create({ name: 'Dossier admin', email: 'dossier-admin@test.invalid', role: 'SCHOOL_ADMIN', schoolId: school._id });
  student = await User.create({ name: 'Nguyen Van A', email: 'dossier-student@test.invalid', role: 'STUDENT', schoolId: school._id, classId: cls._id, code: 'HS001' });
  parent = await User.create({ name: 'Parent', email: 'dossier-parent@test.invalid', role: 'PARENT', schoolId: school._id, parentOf: [student._id] });
  foreign = await User.create({ name: 'Foreign', email: 'dossier-foreign@test.invalid', role: 'STUDENT', schoolId: school._id, code: 'HS002' });
  await Grade.create({ schoolId: school._id, academicYearId: year._id, classId: cls._id, subjectId: subject._id, studentId: student._id, teacherId: admin._id, semester: 1, scores: [{ type: 'MIDTERM', score: 8, weight: 1 }], average: 8, classification: 'GOOD' });
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); if (mongo) await mongo.stop(); await fs.rm(root, { recursive: true, force: true }); });

test('uploads, lists and downloads a scanned student dossier within personal scope', async () => {
  const created = await upload(admin); assert.equal(created.status, 201); assert.equal(created.data.data.title, 'Official transcript');
  assert.equal(await StudentDocument.countDocuments(), 1); assert.equal(await FileAsset.countDocuments({ purpose: 'STUDENT_DOCUMENT', status: 'READY' }), 1);
  const listed = await request('GET', '/student-documents', student); assert.equal(listed.status, 200); assert.equal(listed.data.data.length, 1);
  const queriedForeign = await request('GET', `/student-documents?studentId=${foreign._id}`, parent); assert.equal(queriedForeign.status, 200); assert.equal(queriedForeign.data.data.length, 0);
  const downloaded = await request('GET', `/student-documents/${created.data.data._id}/download`, student); assert.equal(downloaded.status, 200); assert.deepEqual(Buffer.from(await (await fetch(`${origin}/v1/api/student-documents/${created.data.data._id}/download`, { headers: { Authorization: `Bearer ${jwt.sign({ _id: student._id }, process.env.JWT_SECRET)}` } })).arrayBuffer()), pdf);
  assert.match(downloaded.headers.get('content-disposition'), /attachment/);
  assert.equal((await request('GET', `/student-documents/${created.data.data._id}/download`, foreign)).status, 404);
});

test('exports transcript as valid PDF and Word-compatible RTF', async () => {
  const pdfResult = await request('GET', `/students/${student._id}/certificate/pdf`, student); assert.equal(pdfResult.status, 200); assert.equal(pdfResult.headers.get('content-type'), 'application/pdf');
  const pdfBytes = Buffer.from(await (await fetch(`${origin}/v1/api/students/${student._id}/certificate/pdf`, { headers: { Authorization: `Bearer ${jwt.sign({ _id: student._id }, process.env.JWT_SECRET)}` } })).arrayBuffer());
  assert.equal(pdfBytes.subarray(0, 8).toString(), '%PDF-1.4'); assert.ok(pdfBytes.includes(Buffer.from('Nguyen Van A'))); assert.ok(pdfBytes.includes(Buffer.from('Mathematics')));
  const doc = await fetch(`${origin}/v1/api/students/${student._id}/certificate/doc`, { headers: { Authorization: `Bearer ${jwt.sign({ _id: student._id }, process.env.JWT_SECRET)}` } });
  assert.equal(doc.status, 200); assert.equal(doc.headers.get('content-type'), 'application/rtf'); const rtf = Buffer.from(await doc.arrayBuffer()).toString('ascii'); assert.match(rtf, /^\{\\rtf1/); assert.match(rtf, /EDUMOET/);
  assert.equal((await request('GET', `/students/${foreign._id}/certificate/pdf`, parent)).status, 404);
});
