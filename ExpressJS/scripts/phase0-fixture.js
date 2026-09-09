// Local E2E only: never connects to MONGODB_URI or imports the production seed.
Object.assign(process.env, {
  NODE_ENV: 'test', JWT_SECRET: 'phase0-local-fixture-secret', AUTH_MFA_ENCRYPTION_KEY: 'ab'.repeat(32),
  ALLOW_PASSWORD_LOGIN: 'true', AUTH_GMAIL_ONLY: 'false',
  GOOGLE_CLIENT_ID: '', GMAIL_USER: '', GMAIL_APP_PASSWORD: '',
  FILE_STORAGE_DRIVER: 'local', FILE_MAX_BYTES: '10485760', FILE_DEFAULT_QUOTA_BYTES: '5368709120',
});
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
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

let mongo, server, storageRoot;
async function start() {
  console.log('Preparing isolated MongoDB fixture');
  storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'phase1-e2e-'));
  process.env.FILE_LOCAL_ROOT = storageRoot;
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { downloadDir: path.resolve(__dirname, '../node_modules/.cache/mongodb-memory-server') } });
  await mongoose.connect(mongo.getUri());
  console.log('Seeding isolated fixture accounts');
  await Role.create(Object.entries(ROLE_PERMISSIONS).map(([code, keys]) => ({ code, name: code, level: DEFAULT_ROLE_LEVELS[code], permissions: legacyPermissionsToEntries(keys) })));
  await Role.create({ code: 'QA_READER', name: 'QA chỉ xem', level: 35, permissions: ['classes', 'grades', 'attendance', 'fees', 'exams', 'materials', 'library', 'facilities', 'conduct', 'templates', 'support', 'subscriptions', 'jobs'].map(resource => ({ resource, actions: ['view'] })) });
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
    await user('security', 'SUBJECT_TEACHER');
    const student = await user('student', 'STUDENT', { classId: cls._id, code: `QA-ST${i}` });
    const peer = await user('peer', 'STUDENT', { classId: cls._id, code: `QA-PEER${i}` });
    await user('parent', 'PARENT', { parentOf: [student._id] });
    await user('reader', 'QA_READER');
    await user('creator', 'QA_CREATOR');
    const librarian = await user('librarian', 'LIBRARIAN');
    const admin = await user('admin', 'SCHOOL_ADMIN');
    await require('../src/models/Job').create({ schoolId: school._id, kind: 'NOTIFICATION_EMAIL', resourceId: new mongoose.Types.ObjectId(), label: `QA Job ${i}`, status: 'FAILED', attempts: 2, maxAttempts: 2, totalAttempts: 2, lastError: 'SMTP_UNCONFIGURED' });
    await Assignment.create({ schoolId: school._id, teacherId: teacher._id, classId: cls._id, subjectId: subject._id, academicYearId: year._id });
    await require('../src/models/Homework').create({ schoolId: school._id, classId: cls._id, subjectId: subject._id, academicYearId: year._id, teacherId: teacher._id, title: `QA Homework ${i}`, instructions: 'Submit a short solution.', availableFrom: '2026-08-15T00:00:00.000Z', dueAt: '2027-01-15T23:59:00.000Z', maxScore: 10, status: 'PUBLISHED' });
    await require('../src/models/ContactBookEntry').create({ schoolId: school._id, classId: cls._id, studentId: student._id, academicYearId: year._id, authorId: teacher._id, periodType: 'MONTH', periodKey: '2026-09', academicSummary: 'Fixture progress', conductSummary: 'Good', status: 'PUBLISHED', publishedAt: new Date() });
    await require('../src/models/ClassActivity').create({ schoolId: school._id, classId: cls._id, academicYearId: year._id, organizerId: teacher._id, title: `QA Class Activity ${i}`, scheduledAt: '2026-09-20T09:00:00.000Z', agenda: 'Class review', status: 'PUBLISHED', publishedAt: new Date() });
    await require('../src/models/ParentMeeting').create({ schoolId: school._id, classId: cls._id, academicYearId: year._id, organizerId: teacher._id, title: `QA Parent Meeting ${i}`, scheduledAt: '2026-10-01T09:00:00.000Z', meetingUrl: 'https://meet.example.test/qa', agenda: 'Term review', status: 'SCHEDULED' });
    await require('../src/models/Club').create({ schoolId: school._id, name: `QA Science Club ${i}`, description: 'Fixture club', capacity: 20, coordinatorId: admin._id, status: 'OPEN' });
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
  await require('../src/models/FileAsset').init();
  await require('../src/models/Subscription').init();
  await require('../src/models/Job').init();
  server = app.listen(8091, '127.0.0.1');
  server.on('error', async error => { console.error(error.message); await stop(); process.exitCode = 1; });
  server.on('listening', () => console.log('Isolated phase0 fixture ready on http://127.0.0.1:8091'));
}
async function stop() {
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  if (storageRoot && path.dirname(storageRoot) === path.resolve(os.tmpdir()) && path.basename(storageRoot).startsWith('phase1-e2e-')) {
    await fs.rm(storageRoot, { recursive: true, force: true });
  }
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => stop().then(() => process.exit(0)));
start().catch(async error => { console.error(error.message); await stop(); process.exitCode = 1; });
