// Local E2E only: never connects to MONGODB_URI or imports the production seed.
Object.assign(process.env, {
  NODE_ENV: 'test', JWT_SECRET: 'phase0-local-fixture-secret',
  ALLOW_PASSWORD_LOGIN: 'true', AUTH_GMAIL_ONLY: 'false',
  GOOGLE_CLIENT_ID: '', GMAIL_USER: '', GMAIL_APP_PASSWORD: '',
});
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const Role = require('../src/models/Role');
const Cluster = require('../src/models/Cluster');
const School = require('../src/models/School');
const User = require('../src/models/User');
const Class = require('../src/models/Class');
const Year = require('../src/models/AcademicYear');
const Subject = require('../src/models/Subject');
const Assignment = require('../src/models/TeacherAssignment');
const { ROLE_PERMISSIONS } = require('../src/constants/permissions');
const { legacyPermissionsToEntries, DEFAULT_ROLE_LEVELS } = require('../src/constants/permissionCatalog');
const cache = require('../src/services/rolePermissionCache');

let mongo, server;
async function start() {
  console.log('Preparing isolated MongoDB fixture');
  mongo = await MongoMemoryServer.create({ binary: { downloadDir: require('node:path').resolve(__dirname, '../node_modules/.cache/mongodb-memory-server') } });
  await mongoose.connect(mongo.getUri());
  console.log('Seeding isolated fixture accounts');
  await Role.create(Object.entries(ROLE_PERMISSIONS).map(([code, keys]) => ({ code, name: code, level: DEFAULT_ROLE_LEVELS[code], permissions: legacyPermissionsToEntries(keys) })));
  await Role.create({ code: 'QA_READER', name: 'QA chỉ xem', level: 35, permissions: ['classes', 'grades', 'attendance', 'fees', 'exams', 'materials', 'library', 'facilities', 'conduct', 'templates', 'support', 'subscriptions'].map(resource => ({ resource, actions: ['view'] })) });
  await Role.create({ code: 'QA_CREATOR', name: 'QA tạo học liệu', level: 35, permissions: [{ resource: 'materials', actions: ['view', 'create'] }] });
  const cluster = await Cluster.create({ name: 'QA Cluster', code: 'QA' });
  const password = await bcrypt.hash('Phase0@Test123', 4);
  for (let i = 0; i < 2; i++) {
    const school = await School.create({ name: `QA School ${i}`, code: `QA${i}`, subdomain: `qa${i}`, clusterId: cluster._id });
    await Role.create({ code: `QA_LOCAL_${i}`, name: `QA Local Role ${i}`, level: 35, schoolId: school._id, permissions: [{ resource: 'grades', actions: ['view'] }] });
    const year = await Year.create({ schoolId: school._id, name: '2026-2027', startDate: '2026-08-01', endDate: '2027-06-01' });
    const cls = await Class.create({ schoolId: school._id, academicYearId: year._id, name: `QA Class ${i}`, gradeLevel: 10 });
    const subject = await Subject.create({ schoolId: school._id, name: 'QA Math', code: 'MATH' });
    const user = (name, role, extra = {}) => User.create({ name: `${name} ${i}`, email: `${name}${i}@test.invalid`, password, role, schoolId: school._id, clusterId: cluster._id, ...extra });
    const teacher = await user('teacher', 'SUBJECT_TEACHER');
    const student = await user('student', 'STUDENT', { classId: cls._id, code: `QA-ST${i}` });
    const peer = await user('peer', 'STUDENT', { classId: cls._id, code: `QA-PEER${i}` });
    await user('parent', 'PARENT', { parentOf: [student._id] });
    await user('reader', 'QA_READER');
    await user('creator', 'QA_CREATOR');
    const librarian = await user('librarian', 'LIBRARIAN');
    const admin = await user('admin', 'SCHOOL_ADMIN');
    await Assignment.create({ schoolId: school._id, teacherId: teacher._id, classId: cls._id, subjectId: subject._id, academicYearId: year._id });
    for (const pupil of [student, peer]) {
      await require('../src/models/Grade').create({ schoolId: school._id, classId: cls._id, subjectId: subject._id, academicYearId: year._id, studentId: pupil._id, teacherId: teacher._id, average: 8 });
      await require('../src/models/FeeInvoice').create({ schoolId: school._id, studentId: pupil._id, academicYearId: year._id, title: `QA Tuition ${pupil.name}`, amount: 100, dueDate: '2027-01-01' });
    }
    await require('../src/models/Attendance').create({ schoolId: school._id, classId: cls._id, teacherId: teacher._id, date: '2026-09-01', records: [student, peer].map(pupil => ({ studentId: pupil._id, status: 'PRESENT' })) });
    await require('../src/models/Exam').create({ schoolId: school._id, classId: cls._id, subjectId: subject._id, createdBy: teacher._id, title: `QA Exam ${i}`, status: 'PUBLISHED', showResults: false, questions: [{ prompt: '1 + 1?', type: 'MCQ', options: [{ key: 'A', text: '2' }, { key: 'B', text: '3' }], correctKey: 'A', points: 1 }] });
    await require('../src/models/LearningMaterial').create({ schoolId: school._id, classId: cls._id, uploadedBy: teacher._id, title: `QA Material ${i}`, fileUrl: '', isShared: true });
    await require('../src/models/LearningMaterial').create({ schoolId: school._id, uploadedBy: admin._id, title: `QA Private Material ${i}`, isShared: false });
    const book = await require('../src/models/LibraryBook').create({ schoolId: school._id, title: `QA Book ${i}`, quantity: 2, available: 1 });
    await require('../src/models/BookLoan').create({ schoolId: school._id, bookId: book._id, borrowerId: student._id, dueAt: '2027-01-01' });
    for (const requester of [teacher, librarian]) await require('../src/models/FacilityRequest').create({ schoolId: school._id, requesterId: requester._id, itemName: `QA Room ${requester.name}`, from: '2026-10-01', to: '2026-10-02' });
    await require('../src/models/Announcement').create({ schoolId: school._id, createdBy: teacher._id, title: `QA Notice ${i}`, content: 'Fixture notice', scope: 'SCHOOL' });
    await require('../src/models/Announcement').create({ schoolId: school._id, classId: cls._id, createdBy: teacher._id, title: `QA Parent Notice ${i}`, content: 'Parent meeting', scope: 'CLASS', targetRoles: ['PARENT'] });
    await require('../src/models/CalendarEvent').create({ schoolId: school._id, createdBy: teacher._id, title: `QA Event ${i}`, startAt: '2026-10-01', endAt: '2026-10-02' });
  }
  // Deliberately stale legacy link: dashboard and every personal list must reject it.
  const foreignChild = await User.findOne({ email: 'student1@test.invalid' }).select('_id');
  await User.updateOne({ email: 'parent0@test.invalid' }, { $push: { parentOf: foreignChild._id } });
  await cache.reload();
  await require('../src/models/ExamAttempt').init();
  server = app.listen(8091, '127.0.0.1');
  server.on('error', async error => { console.error(error.message); await stop(); process.exitCode = 1; });
  server.on('listening', () => console.log('Isolated phase0 fixture ready on http://127.0.0.1:8091'));
}
async function stop() {
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => stop().then(() => process.exit(0)));
start().catch(async error => { console.error(error.message); await stop(); process.exitCode = 1; });
