const { ROLES } = require('../../../../config/constants/roles.config');
const { ATTENDANCE_STATUS, GRADE_TYPES } = require('../../../../config/constants/status.config');

class SeedAcademicData {
  constructor(dependencies) {
    this.seedRepository = dependencies.repositories.seed;
    this.gradeStrategyService = dependencies.services['grade-strategy'];
    this.ROLES = ROLES;
    this.attendanceStatus = ATTENDANCE_STATUS;
    this.gradeTypes = GRADE_TYPES;
  }

  async seed({ cluster, school1, school2, password, teacher, homeroom }) {
    const { seedRepository } = this;
    const { ROLES, attendanceStatus: ATTENDANCE_STATUS, gradeTypes: GRADE_TYPES } = this;
    const getGradeStrategy = this.gradeStrategyService.getGradeStrategy.bind(this.gradeStrategyService);
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
    return { year, class8A, student1, student2, parent, math, lit, eng };
  }
}

module.exports = SeedAcademicData;
