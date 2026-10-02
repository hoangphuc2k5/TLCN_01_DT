const BaseRepository = require("./base.repository");
class SharedRepository {
  constructor({ models }) {
    const map = {
      userRepo: 'user', schoolRepo: 'school', clusterRepo: 'cluster', classRepo: 'class',
      gradeRepo: 'grade', attendanceRepo: 'attendance', feeRepo: 'fee-invoice',
      leaveRepo: 'leave-request', announcementRepo: 'announcement', timetableRepo: 'timetable',
      notificationRepo: 'notification', subjectRepo: 'subject', academicYearRepo: 'academic-year',
      assignmentRepo: 'teacher-assignment', paymentRepo: 'payment', onlinePaymentRepo: 'online-payment',
      appointmentRepo: 'teacher-appointment', surveyRepo: 'satisfaction-survey',
      rewardRepo: 'reward-discipline-record', admissionRepo: 'admission-application',
      studentDocumentRepo: 'student-document', payrollRepo: 'payroll-record',
    };
    for (const [name, model] of Object.entries(map)) this[name] = new BaseRepository(models[model]);
  }
}

module.exports = SharedRepository;
