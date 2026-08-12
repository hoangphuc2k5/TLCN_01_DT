const BaseRepository = require('../patterns/BaseRepository');
const User = require('../models/User');
const School = require('../models/School');
const Cluster = require('../models/Cluster');
const Class = require('../models/Class');
const Grade = require('../models/Grade');
const Attendance = require('../models/Attendance');
const FeeInvoice = require('../models/FeeInvoice');
const LeaveRequest = require('../models/LeaveRequest');
const Announcement = require('../models/Announcement');
const Timetable = require('../models/Timetable');
const Notification = require('../models/Notification');
const Subject = require('../models/Subject');
const AcademicYear = require('../models/AcademicYear');
const TeacherAssignment = require('../models/TeacherAssignment');
const Payment = require('../models/Payment');

module.exports = {
  userRepo: new BaseRepository(User),
  schoolRepo: new BaseRepository(School),
  clusterRepo: new BaseRepository(Cluster),
  classRepo: new BaseRepository(Class),
  gradeRepo: new BaseRepository(Grade),
  attendanceRepo: new BaseRepository(Attendance),
  feeRepo: new BaseRepository(FeeInvoice),
  leaveRepo: new BaseRepository(LeaveRequest),
  announcementRepo: new BaseRepository(Announcement),
  timetableRepo: new BaseRepository(Timetable),
  notificationRepo: new BaseRepository(Notification),
  subjectRepo: new BaseRepository(Subject),
  academicYearRepo: new BaseRepository(AcademicYear),
  assignmentRepo: new BaseRepository(TeacherAssignment),
  paymentRepo: new BaseRepository(Payment),
};
