const { FEE_STATUS, LEAVE_TYPES, ANNOUNCEMENT_SCOPE } = require('../../../../config/constants/status.config');

class SeedFunctionalData {
  constructor(dependencies) {
    this.seedRepository = dependencies.repositories.seed;
    this.logger = dependencies.logger;
    this.constants = { FEE_STATUS, LEAVE_TYPES, ANNOUNCEMENT_SCOPE };
  }

  async seed({ school1, cluster, schoolAdmin, teacher, homeroom, student1, student2, parent, year, class8A, math, lit, eng, superAdmin, librarian }) {
    const { seedRepository } = this;
    const { FEE_STATUS, LEAVE_TYPES, ANNOUNCEMENT_SCOPE } = this.constants;
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
  }
}

module.exports = SeedFunctionalData;
