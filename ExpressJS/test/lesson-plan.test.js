const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'lesson-plan-test-secret';

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
const LessonPlan = require('../src/models/LessonPlan');
const Notification = require('../src/models/Notification');

let mongo, server, origin, school, foreignSchool, year, cls, subject, actors;

const request = async (method, path, actor, body) => {
  const response = await fetch(`${origin}/v1/api${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${jwt.sign({ _id: actor._id }, process.env.JWT_SECRET)}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, ...(await response.json()) };
};

const payload = (extra = {}) => ({
  title: 'Phương trình bậc hai',
  classId: cls._id,
  subjectId: subject._id,
  academicYearId: year._id,
  lessonDate: '2030-09-10T00:00:00.000Z',
  durationMinutes: 45,
  objectives: 'Học sinh giải được phương trình bậc hai.',
  preparation: 'Phiếu học tập và máy chiếu.',
  content: 'Khái niệm, công thức nghiệm và bài tập vận dụng.',
  activities: [{
    title: 'Luyện tập', durationMinutes: 30,
    teacherActivities: 'Giao bài và hướng dẫn.', studentActivities: 'Giải bài theo nhóm.', assessment: 'Đánh giá sản phẩm nhóm.',
  }],
  ...extra,
});

before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Role.create(Object.entries(ROLE_PERMISSIONS).map(([code, permissions]) => ({
    code, name: code, level: DEFAULT_ROLE_LEVELS[code], permissions: legacyPermissionsToEntries(permissions),
  })));
  await cache.reload();
  school = await School.create({ name: 'Lesson School', code: 'LPS', subdomain: 'lesson' });
  foreignSchool = await School.create({ name: 'Foreign School', code: 'LPF', subdomain: 'lesson-foreign' });
  year = await Year.create({ schoolId: school._id, name: '2030', startDate: '2030-08-01', endDate: '2031-06-30' });
  cls = await Class.create({ schoolId: school._id, academicYearId: year._id, name: '10A1', gradeLevel: 10 });
  subject = await Subject.create({ schoolId: school._id, name: 'Toán', code: 'MATH' });
  actors = {};
  for (const [name, role, ownerSchool] of [
    ['teacher', 'SUBJECT_TEACHER', school], ['otherTeacher', 'SUBJECT_TEACHER', school],
    ['admin', 'SCHOOL_ADMIN', school], ['academic', 'ACADEMIC_AFFAIRS', school],
    ['librarian', 'LIBRARIAN', school], ['foreignAdmin', 'SCHOOL_ADMIN', foreignSchool],
  ]) {
    actors[name] = await User.create({ name, email: `${name}@lesson.invalid`, role, schoolId: ownerSchool._id });
  }
  await TeacherAssignment.create({ schoolId: school._id, teacherId: actors.teacher._id, classId: cls._id, subjectId: subject._id, academicYearId: year._id });
  await LessonPlan.init();
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(async () => Promise.all([LessonPlan.deleteMany({}), Notification.deleteMany({})]));
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test('teacher submits, revises after rejection and receives an approval notification', async () => {
  const created = await request('POST', '/lesson-plans', actors.teacher, payload());
  assert.equal(created.status, 201, created.EM);
  assert.equal(created.data.status, 'DRAFT');

  const submitted = await request('PATCH', `/lesson-plans/${created.data._id}/submit`, actors.teacher);
  assert.equal(submitted.status, 200, submitted.EM);
  assert.equal(submitted.data.revision, 1);
  assert.equal((await request('PATCH', `/lesson-plans/${created.data._id}/review`, actors.teacher, { status: 'APPROVED' })).status, 403);
  assert.equal((await request('PUT', `/lesson-plans/${created.data._id}`, actors.teacher, { title: 'Không được sửa' })).status, 409);

  const rejected = await request('PATCH', `/lesson-plans/${created.data._id}/review`, actors.academic, { status: 'REJECTED', reviewNote: 'Bổ sung hoạt động khởi động.' });
  assert.equal(rejected.status, 200, rejected.EM);
  assert.equal(rejected.data.status, 'REJECTED');
  assert.equal(rejected.data.reviews.length, 1);

  const revised = await request('PUT', `/lesson-plans/${created.data._id}`, actors.teacher, { title: 'Phương trình bậc hai — bản sửa' });
  assert.equal(revised.status, 200, revised.EM);
  assert.equal((await request('PATCH', `/lesson-plans/${created.data._id}/submit`, actors.teacher)).data.revision, 2);
  const approved = await request('PATCH', `/lesson-plans/${created.data._id}/review`, actors.admin, { status: 'APPROVED', reviewNote: 'Đạt yêu cầu.' });
  assert.equal(approved.status, 200, approved.EM);
  assert.equal(approved.data.status, 'APPROVED');
  assert.equal(approved.data.reviews.length, 2);
  assert.equal(await Notification.countDocuments({
    userId: actors.teacher._id,
    'meta.lessonPlanId': new mongoose.Types.ObjectId(created.data._id),
  }), 2);
});

test('assignment, tenant, role and submission completeness are enforced', async () => {
  assert.equal((await request('POST', '/lesson-plans', actors.otherTeacher, payload())).status, 403);
  assert.equal((await request('POST', '/lesson-plans', actors.admin, payload())).status, 403);
  assert.equal((await request('GET', '/lesson-plans', actors.librarian)).status, 403);

  const incomplete = await request('POST', '/lesson-plans', actors.teacher, payload({ objectives: '', content: '', activities: [] }));
  assert.equal(incomplete.status, 201, incomplete.EM);
  assert.equal((await request('PATCH', `/lesson-plans/${incomplete.data._id}/submit`, actors.teacher)).status, 400);
  assert.equal((await request('PATCH', `/lesson-plans/${incomplete.data._id}/review`, actors.admin, { status: 'REJECTED' })).status, 400);
  assert.equal((await request('GET', `/lesson-plans/${incomplete.data._id}`, actors.foreignAdmin)).status, 404);

  assert.equal((await request('POST', '/lesson-plans', actors.teacher, payload({ lessonDate: '2032-01-01' }))).status, 400);
  assert.equal((await request('POST', '/lesson-plans', actors.teacher, payload({ activities: [{ title: 'Quá dài', durationMinutes: 46 }] }))).status, 201);
});

test('review transition is atomic and approved plans cannot be deleted', async () => {
  const created = await request('POST', '/lesson-plans', actors.teacher, payload());
  await request('PATCH', `/lesson-plans/${created.data._id}/submit`, actors.teacher);
  const reviews = await Promise.all([
    request('PATCH', `/lesson-plans/${created.data._id}/review`, actors.admin, { status: 'APPROVED' }),
    request('PATCH', `/lesson-plans/${created.data._id}/review`, actors.academic, { status: 'REJECTED', reviewNote: 'Cần sửa.' }),
  ]);
  assert.deepEqual(reviews.map(result => result.status).sort(), [200, 409]);
  const saved = await LessonPlan.findById(created.data._id);
  assert.equal(saved.reviews.length, 1);
  assert.equal((await request('DELETE', `/lesson-plans/${created.data._id}`, actors.teacher)).status, 409);

  const draft = await request('POST', '/lesson-plans', actors.teacher, payload({ title: 'Bản nháp có thể xóa' }));
  assert.equal((await request('DELETE', `/lesson-plans/${draft.data._id}`, actors.teacher)).status, 200);
  assert.equal(await LessonPlan.exists({ _id: draft.data._id }), null);
});
