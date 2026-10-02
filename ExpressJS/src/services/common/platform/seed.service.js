/**
 * Seed demo data — Facade-style orchestration for MVP demo
 * Run: npm run seed
 */
const bcrypt = require('bcrypt');

const { ROLES } = require('../../../config/constants/roles.config');
const {
  ATTENDANCE_STATUS,
  GRADE_TYPES,
  FEE_STATUS,
  LEAVE_TYPES,
  ANNOUNCEMENT_SCOPE,
} = require('../../../config/constants/status.config');
const DEMO_PASSWORD = 'Password@123';

function createSeedService(dependencies) {
const seedRepository = dependencies.repositories.seed;
const { seedSystemRoles } = dependencies.services.role;
const { getGradeStrategy } = dependencies.services["grade-strategy"];
const logger = dependencies.logger;

async function clearAll() {
  const collections = [
    'notification', 'leave-request', 'attendance', 'grade', 'fee-invoice',
    'timetable', 'teacher-assignment', 'announcement', 'exam-attempt', 'exam',
    'learning-material', 'book-loan', 'library-book', 'facility-request',
    'support-ticket', 'conduct-record', 'shared-template', 'subscription-invoice',
    'subscription', 'message', 'calendar-event', 'audit-log', 'class', 'subject',
    'academic-year', 'user', 'school', 'cluster', 'role',
  ];
  await seedRepository.clear(collections);
}

async function seed() {
  logger.log('Connected. Clearing old data...');
  await clearAll();

  logger.log('Seeding system roles...');
  await seedSystemRoles({ force: true });

  const password = await bcrypt.hash(DEMO_PASSWORD, 10);

  const cluster = await seedRepository.create('cluster', {
    name: 'Hệ thống Giáo dục Ánh Sáng',
    code: 'ANHSANG',
    description: 'Cụm trường demo đa cơ sở',
  });

  const school1 = await seedRepository.create('school', {
    name: 'THCS Ánh Sáng - Cơ sở 1',
    code: 'AS1',
    subdomain: 'as1',
    clusterId: cluster._id,
    address: '123 Nguyễn Huệ, Q1, TP.HCM',
    phone: '0281234567',
    email: 'as1@anhsang.edu.vn',
    schoolType: 'SECONDARY',
  });

  const school2 = await seedRepository.create('school', {
    name: 'THCS Ánh Sáng - Cơ sở 2',
    code: 'AS2',
    subdomain: 'as2',
    clusterId: cluster._id,
    address: '45 Lê Lợi, Q3, TP.HCM',
    phone: '0287654321',
    email: 'as2@anhsang.edu.vn',
    schoolType: 'SECONDARY',
  });

  await seedRepository.create('subscription', {
    schoolId: school1._id,
    plan: 'PREMIUM',
    maxStudents: 1000,
    maxTeachers: 100,
    storageGb: 50,
    features: ['exams', 'library', 'materials'],
    expiresAt: new Date('2026-12-31'),
    status: 'ACTIVE',
  });

  const sub1 = await seedRepository.findOne('subscription', { schoolId: school1._id });
  await seedRepository.create('subscription-invoice', {
    schoolId: school1._id,
    subscriptionId: sub1._id,
    plan: 'PREMIUM',
    amount: 5000000,
    periodStart: new Date('2026-01-01'),
    periodEnd: new Date('2026-12-31'),
    status: 'PAID',
    paidAt: new Date('2026-01-02'),
    note: 'Gia hạn năm 2026',
  });

  await seedRepository.create('subscription', {
    schoolId: school2._id,
    plan: 'BASIC',
    maxStudents: 500,
    maxTeachers: 50,
    storageGb: 20,
    expiresAt: new Date('2026-06-30'),
    status: 'ACTIVE',
  });

  const superAdmin = await seedRepository.create('user', {
    name: 'Super Admin',
    email: 'superadmin@system.vn',
    password,
    role: ROLES.SUPER_ADMIN,
    code: 'SA001',
  });

  const clusterAdmin = await seedRepository.create('user', {
    name: 'Quản lý cụm Ánh Sáng',
    email: 'cluster@anhsang.edu.vn',
    password,
    role: ROLES.CLUSTER_ADMIN,
    clusterId: cluster._id,
    code: 'CA001',
  });

  const schoolAdmin = await seedRepository.create('user', {
    name: 'Hiệu trưởng Nguyễn Văn A',
    email: 'hieutruong@as1.edu.vn',
    password,
    role: ROLES.SCHOOL_ADMIN,
    schoolId: school1._id,
    clusterId: cluster._id,
    code: 'HT001',
  });

  const academic = await seedRepository.create('user', {
    name: 'Giáo vụ Trần Thị B',
    email: 'giaovu@as1.edu.vn',
    password,
    role: ROLES.ACADEMIC_AFFAIRS,
    schoolId: school1._id,
    clusterId: cluster._id,
    code: 'GVU001',
  });

  const teacher = await seedRepository.create('user', {
    name: 'GV Toán Lê Văn C',
    email: 'gvtoan@as1.edu.vn',
    password,
    role: ROLES.SUBJECT_TEACHER,
    schoolId: school1._id,
    clusterId: cluster._id,
    code: 'GV001',
  });

  const homeroom = await seedRepository.create('user', {
    name: 'GVCN Phạm Thị D',
    email: 'gvcn@as1.edu.vn',
    password,
    role: ROLES.HOMEROOM_TEACHER,
    schoolId: school1._id,
    clusterId: cluster._id,
    code: 'CN001',
  });

  const accountant = await seedRepository.create('user', {
    name: 'Kế toán Hoàng E',
    email: 'ketoan@as1.edu.vn',
    password,
    role: ROLES.ACCOUNTANT,
    schoolId: school1._id,
    clusterId: cluster._id,
    code: 'KT001',
  });

  const librarian = await seedRepository.create('user', {
    name: 'Thủ thư Ngô F',
    email: 'thuthu@as1.edu.vn',
    password,
    role: ROLES.LIBRARIAN,
    schoolId: school1._id,
    clusterId: cluster._id,
    code: 'TT001',
  });

  const year = await seedRepository.create('academic-year', {
    schoolId: school1._id,
    name: '2025-2026',
    startDate: new Date('2025-09-01'),
    endDate: new Date('2026-05-31'),
    isCurrent: true,
  });

  const class8A = await seedRepository.create('class', {
    schoolId: school1._id,
    academicYearId: year._id,
    name: '8A',
    gradeLevel: 8,
    homeroomTeacherId: homeroom._id,
    room: 'P201',
  });

  await seedRepository.findByIdAndUpdate('user', homeroom._id, { classId: class8A._id });

  const student1 = await seedRepository.create('user', {
    name: 'Học sinh Nguyễn Minh G',
    email: 'hs1@as1.edu.vn',
    password,
    role: ROLES.STUDENT,
    schoolId: school1._id,
    clusterId: cluster._id,
    code: 'HS001',
    classId: class8A._id,
    gender: 'Male',
  });

  const student2 = await seedRepository.create('user', {
    name: 'Học sinh Trần Lan H',
    email: 'hs2@as1.edu.vn',
    password,
    role: ROLES.STUDENT,
    schoolId: school1._id,
    clusterId: cluster._id,
    code: 'HS002',
    classId: class8A._id,
    gender: 'Female',
  });

  const parent = await seedRepository.create('user', {
    name: 'Phụ huynh Nguyễn Văn I',
    email: 'phuhuynh@as1.edu.vn',
    password,
    role: ROLES.PARENT,
    schoolId: school1._id,
    clusterId: cluster._id,
    code: 'PH001',
    parentOf: [student1._id, student2._id],
  });

  // School 2 admin for multi-tenant demo
  await seedRepository.create('user', {
    name: 'Hiệu trưởng Cơ sở 2',
    email: 'hieutruong@as2.edu.vn',
    password,
    role: ROLES.SCHOOL_ADMIN,
    schoolId: school2._id,
    clusterId: cluster._id,
    code: 'HT002',
  });

  const math = await seedRepository.create('subject', {
    schoolId: school1._id,
    name: 'Toán',
    code: 'MATH',
    gradeLevels: [6, 7, 8, 9],
  });
  const lit = await seedRepository.create('subject', {
    schoolId: school1._id,
    name: 'Ngữ văn',
    code: 'LIT',
    gradeLevels: [6, 7, 8, 9],
  });
  const eng = await seedRepository.create('subject', {
    schoolId: school1._id,
    name: 'Tiếng Anh',
    code: 'ENG',
    gradeLevels: [6, 7, 8, 9],
  });

  await seedRepository.create('teacher-assignment', {
    schoolId: school1._id,
    teacherId: teacher._id,
    classId: class8A._id,
    subjectId: math._id,
    academicYearId: year._id,
  });
  await seedRepository.create('teacher-assignment', {
    schoolId: school1._id,
    teacherId: homeroom._id,
    classId: class8A._id,
    subjectId: lit._id,
    academicYearId: year._id,
  });

  const scores1 = [
    { type: GRADE_TYPES.ORAL, score: 8, weight: 1 },
    { type: GRADE_TYPES.QUIZ_15, score: 7.5, weight: 1 },
    { type: GRADE_TYPES.MIDTERM, score: 8.5, weight: 2 },
    { type: GRADE_TYPES.FINAL, score: 9, weight: 3 },
  ];
  const strategy = getGradeStrategy('weighted');
  const avg1 = strategy.calculateAverage(scores1);

  await seedRepository.create('grade', {
    schoolId: school1._id,
    academicYearId: year._id,
    classId: class8A._id,
    subjectId: math._id,
    studentId: student1._id,
    teacherId: teacher._id,
    semester: 1,
    scores: scores1,
    average: avg1,
    classification: strategy.classify(avg1),
  });

  await seedRepository.create('attendance', {
    schoolId: school1._id,
    classId: class8A._id,
    subjectId: math._id,
    teacherId: teacher._id,
    date: new Date(),
    period: 1,
    records: [
      { studentId: student1._id, status: ATTENDANCE_STATUS.PRESENT },
      { studentId: student2._id, status: ATTENDANCE_STATUS.LATE, note: 'Đến muộn 10 phút' },
    ],
  });

  await seedRepository.create('fee-invoice', {
    schoolId: school1._id,
    studentId: student1._id,
    academicYearId: year._id,
    title: 'Học phí học kỳ 1',
    amount: 5000000,
    paidAmount: 2000000,
    dueDate: new Date('2026-01-15'),
    status: FEE_STATUS.PARTIAL,
  });

  await seedRepository.create('fee-invoice', {
    schoolId: school1._id,
    studentId: student2._id,
    academicYearId: year._id,
    title: 'Học phí học kỳ 1',
    amount: 5000000,
    paidAmount: 0,
    dueDate: new Date('2026-01-15'),
    status: FEE_STATUS.UNPAID,
  });

  await seedRepository.create('timetable', {
    schoolId: school1._id,
    academicYearId: year._id,
    classId: class8A._id,
    status: 'APPROVED',
    approvedBy: schoolAdmin._id,
    slots: [
      { dayOfWeek: 1, period: 1, subjectId: math._id, teacherId: teacher._id, room: 'P201' },
      { dayOfWeek: 1, period: 2, subjectId: lit._id, teacherId: homeroom._id, room: 'P201' },
      { dayOfWeek: 2, period: 1, subjectId: eng._id, teacherId: teacher._id, room: 'P201' },
      { dayOfWeek: 3, period: 3, subjectId: math._id, teacherId: teacher._id, room: 'P201' },
    ],
  });

  await seedRepository.create('announcement', {
    title: 'Chào mừng năm học mới',
    content: 'Nhà trường thông báo lịch khai giảng và họp phụ huynh đầu năm.',
    scope: ANNOUNCEMENT_SCOPE.SCHOOL,
    schoolId: school1._id,
    createdBy: schoolAdmin._id,
    isPinned: true,
  });

  await seedRepository.create('announcement', {
    title: 'Bảo trì hệ thống',
    content: 'Hệ thống sẽ bảo trì vào Chủ nhật tuần này từ 22:00-23:00.',
    scope: ANNOUNCEMENT_SCOPE.SYSTEM,
    createdBy: superAdmin._id,
  });

  await seedRepository.create('leave-request', {
    schoolId: school1._id,
    requesterId: parent._id,
    studentId: student1._id,
    type: LEAVE_TYPES.STUDENT_ABSENCE,
    reason: 'Con bị ốm, xin nghỉ 1 ngày',
    fromDate: new Date(),
    toDate: new Date(),
    status: 'PENDING',
  });

  await seedRepository.create('notification', {
    userId: parent._id,
    schoolId: school1._id,
    title: 'Chào mừng',
    message: 'Tài khoản phụ huynh demo đã sẵn sàng.',
    type: 'INFO',
  });

  const exam = await seedRepository.create('exam', {
    schoolId: school1._id,
    title: 'Kiểm tra 15 phút Toán - Chương 1',
    subjectId: math._id,
    classId: class8A._id,
    createdBy: teacher._id,
    startAt: new Date(Date.now() - 86400000),
    endAt: new Date(Date.now() + 7 * 86400000),
    durationMinutes: 15,
    maxAttempts: 2,
    status: 'PUBLISHED',
    questions: [
      {
        type: 'MCQ',
        prompt: '2 + 2 = ?',
        options: [
          { key: 'A', text: '3' },
          { key: 'B', text: '4' },
          { key: 'C', text: '5' },
        ],
        correctKey: 'B',
        points: 1,
      },
      {
        type: 'MCQ',
        prompt: 'Căn bậc hai của 9 là?',
        options: [
          { key: 'A', text: '2' },
          { key: 'B', text: '3' },
          { key: 'C', text: '4' },
        ],
        correctKey: 'B',
        points: 1,
      },
      {
        type: 'ESSAY',
        prompt: 'Nêu định nghĩa số nguyên tố.',
        options: [],
        correctKey: '',
        points: 2,
      },
    ],
  });

  await seedRepository.create('exam-attempt', {
    schoolId: school1._id,
    examId: exam._id,
    studentId: student1._id,
    answers: [
      { questionId: exam.questions[0]._id, answerKey: 'B', isCorrect: true, pointsAwarded: 1 },
      { questionId: exam.questions[1]._id, answerKey: 'B', isCorrect: true, pointsAwarded: 1 },
      { questionId: exam.questions[2]._id, answerText: 'Số chỉ chia hết cho 1 và chính nó', isCorrect: null, pointsAwarded: 0 },
    ],
    score: 2,
    maxScore: 4,
    status: 'SUBMITTED',
    submittedAt: new Date(),
  });

  await seedRepository.create('learning-material', {
    schoolId: school1._id,
    title: 'Bài giảng Toán Chương 1',
    subjectId: math._id,
    classId: class8A._id,
    uploadedBy: teacher._id,
    fileUrl: 'https://example.com/toan-chuong1.pdf',
    fileType: 'PDF',
    topic: 'Chương 1',
    description: 'Tài liệu ôn tập',
  });

  const book = await seedRepository.create('library-book', {
    schoolId: school1._id,
    title: 'Toán lớp 8',
    author: 'NXB Giáo dục',
    isbn: '978-604-0-12345',
    quantity: 5,
    available: 4,
  });

  await seedRepository.create('book-loan', {
    schoolId: school1._id,
    bookId: book._id,
    borrowerId: student1._id,
    dueAt: new Date(Date.now() + 14 * 86400000),
    status: 'BORROWED',
    processedBy: librarian._id,
  });

  await seedRepository.create('facility-request', {
    schoolId: school1._id,
    requesterId: teacher._id,
    itemType: 'EQUIPMENT',
    itemName: 'Máy chiếu phòng P201',
    from: new Date(),
    to: new Date(Date.now() + 2 * 3600000),
    status: 'PENDING',
    note: 'Dạy tiết thực hành',
  });

  await seedRepository.create('support-ticket', {
    schoolId: school1._id,
    clusterId: cluster._id,
    createdBy: schoolAdmin._id,
    title: 'Không gửi được thông báo email',
    description: 'Module thông báo báo lỗi khi gửi email hàng loạt.',
    category: 'TECHNICAL',
    priority: 'HIGH',
    status: 'OPEN',
  });

  await seedRepository.create('conduct-record', {
    schoolId: school1._id,
    academicYearId: year._id,
    studentId: student1._id,
    classId: class8A._id,
    semester: 1,
    rating: 'TOT',
    comment: 'Chăm chỉ, đoàn kết',
    recordedBy: homeroom._id,
  });

  const tpl = await seedRepository.create('shared-template', {
    name: 'Mẫu học bạ chuẩn Bộ GD&ĐT',
    type: 'TRANSCRIPT',
    scope: 'SYSTEM',
    content: 'Mẫu học bạ điện tử chuẩn quốc gia v2025',
    version: '2025.1',
    createdBy: superAdmin._id,
  });

  await seedRepository.findByIdAndUpdate('school', school1._id, { appliedTemplateIds: [tpl._id] });

  await seedRepository.create('audit-log', {
    actorId: superAdmin._id,
    schoolId: school1._id,
    action: 'SEED',
    resource: 'System',
    details: { message: 'Demo data seeded' },
  });

  await seedRepository.create('calendar-event', {
    schoolId: school1._id,
    title: 'Họp phụ huynh đầu năm',
    description: 'Phòng hội trường A',
    type: 'MEETING',
    startAt: new Date(Date.now() + 3 * 86400000),
    endAt: new Date(Date.now() + 3 * 86400000 + 2 * 3600000),
    classId: class8A._id,
    createdBy: schoolAdmin._id,
  });

  await seedRepository.create('message', {
    schoolId: school1._id,
    senderId: homeroom._id,
    receiverId: parent._id,
    subject: 'Thông báo lớp 8A',
    body: 'Kính gửi phụ huynh, vui lòng theo dõi lịch họp phụ huynh trên hệ thống.',
    isRead: false,
  });

  logger.log('\n========== SEED COMPLETE ==========');
  logger.log(`Password for all accounts: ${DEMO_PASSWORD}\n`);
  logger.log('Accounts:');
  logger.log('  superadmin@system.vn          SUPER_ADMIN');
  logger.log('  cluster@anhsang.edu.vn        CLUSTER_ADMIN');
  logger.log('  hieutruong@as1.edu.vn         SCHOOL_ADMIN (CS1)');
  logger.log('  giaovu@as1.edu.vn             ACADEMIC_AFFAIRS');
  logger.log('  gvtoan@as1.edu.vn             SUBJECT_TEACHER');
  logger.log('  gvcn@as1.edu.vn               HOMEROOM_TEACHER');
  logger.log('  ketoan@as1.edu.vn             ACCOUNTANT');
  logger.log('  thuthu@as1.edu.vn             LIBRARIAN');
  logger.log('  hs1@as1.edu.vn                STUDENT');
  logger.log('  phuhuynh@as1.edu.vn           PARENT');
  logger.log('  hieutruong@as2.edu.vn         SCHOOL_ADMIN (CS2)');
  logger.log('===================================\n');

}

return { run: seed };
}

class SeedService {
  constructor(dependencies) {
    Object.assign(this, createSeedService(dependencies));
  }
}

module.exports = SeedService;
