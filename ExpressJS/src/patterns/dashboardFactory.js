const { ROLES } = require('../constants/roles');
const User = require('../models/User');
const School = require('../models/School');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const FeeInvoice = require('../models/FeeInvoice');
const LeaveRequest = require('../models/LeaveRequest');
const Grade = require('../models/Grade');
const Announcement = require('../models/Announcement');
const { FEE_STATUS, LEAVE_STATUS } = require('../constants/status');

/**
 * Factory Pattern — build dashboard payload per role
 */
class DashboardFactory {
  static create(role) {
    switch (role) {
      case ROLES.SUPER_ADMIN:
        return new SuperAdminDashboard();
      case ROLES.CLUSTER_ADMIN:
        return new ClusterAdminDashboard();
      case ROLES.SCHOOL_ADMIN:
        return new SchoolAdminDashboard();
      case ROLES.ACADEMIC_AFFAIRS:
        return new AcademicAffairsDashboard();
      case ROLES.SUBJECT_TEACHER:
      case ROLES.HOMEROOM_TEACHER:
        return new TeacherDashboard();
      case ROLES.ACCOUNTANT:
        return new AccountantDashboard();
      case ROLES.STUDENT:
        return new StudentDashboard();
      case ROLES.PARENT:
        return new ParentDashboard();
      case ROLES.LIBRARIAN:
        return new LibrarianDashboard();
      default:
        return new DefaultDashboard();
    }
  }
}

class BaseDashboard {
  async build(_user) {
    return { title: 'Dashboard', stats: [], widgets: [] };
  }
}

class SuperAdminDashboard extends BaseDashboard {
  async build() {
    const [schools, users, clusters, announcements] = await Promise.all([
      School.countDocuments(),
      User.countDocuments(),
      require('../models/Cluster').countDocuments(),
      Announcement.countDocuments({ scope: 'SYSTEM' }),
    ]);
    return {
      title: 'Tổng quan hệ thống',
      stats: [
        { key: 'schools', label: 'Số trường', value: schools },
        { key: 'users', label: 'Người dùng', value: users },
        { key: 'clusters', label: 'Cụm trường', value: clusters },
        { key: 'systemAnnouncements', label: 'TB hệ thống', value: announcements },
      ],
    };
  }
}

class ClusterAdminDashboard extends BaseDashboard {
  async build(user) {
    const schools = await School.find({ clusterId: user.clusterId });
    const schoolIds = schools.map((s) => s._id);
    const [users, unpaid] = await Promise.all([
      User.countDocuments({ schoolId: { $in: schoolIds } }),
      FeeInvoice.countDocuments({ schoolId: { $in: schoolIds }, status: { $in: [FEE_STATUS.UNPAID, FEE_STATUS.OVERDUE] } }),
    ]);
    return {
      title: 'Tổng quan cụm trường',
      stats: [
        { key: 'schools', label: 'Trường trong cụm', value: schools.length },
        { key: 'users', label: 'Người dùng', value: users },
        { key: 'unpaid', label: 'Hóa đơn chưa thanh toán', value: unpaid },
      ],
      schools: schools.map((s) => ({ _id: s._id, name: s.name, code: s.code, status: s.status })),
    };
  }
}

class SchoolAdminDashboard extends BaseDashboard {
  async build(user) {
    const schoolId = user.schoolId;
    const [students, teachers, classes, pendingLeave, unpaid] = await Promise.all([
      User.countDocuments({ schoolId, role: ROLES.STUDENT }),
      User.countDocuments({
        schoolId,
        role: { $in: [ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER] },
      }),
      Class.countDocuments({ schoolId }),
      LeaveRequest.countDocuments({ schoolId, status: LEAVE_STATUS.PENDING }),
      FeeInvoice.countDocuments({ schoolId, status: { $in: [FEE_STATUS.UNPAID, FEE_STATUS.OVERDUE] } }),
    ]);
    return {
      title: 'Bảng điều khiển nhà trường',
      stats: [
        { key: 'students', label: 'Học sinh', value: students },
        { key: 'teachers', label: 'Giáo viên', value: teachers },
        { key: 'classes', label: 'Lớp học', value: classes },
        { key: 'pendingLeave', label: 'Đơn chờ duyệt', value: pendingLeave },
        { key: 'unpaid', label: 'Công nợ học phí', value: unpaid },
      ],
    };
  }
}

class AcademicAffairsDashboard extends SchoolAdminDashboard {
  async build(user) {
    const base = await super.build(user);
    base.title = 'Bảng điều khiển Giáo vụ';
    return base;
  }
}

class TeacherDashboard extends BaseDashboard {
  async build(user) {
    const schoolId = user.schoolId;
    const attendanceCount = await Attendance.countDocuments({ teacherId: user._id });
    const gradeCount = await Grade.countDocuments({ teacherId: user._id });
    return {
      title: 'Bảng điều khiển Giáo viên',
      stats: [
        { key: 'attendanceSessions', label: 'Buổi điểm danh', value: attendanceCount },
        { key: 'gradeSheets', label: 'Bảng điểm', value: gradeCount },
      ],
    };
  }
}

class AccountantDashboard extends BaseDashboard {
  async build(user) {
    const schoolId = user.schoolId;
    const [unpaid, paid, overdue] = await Promise.all([
      FeeInvoice.countDocuments({ schoolId, status: FEE_STATUS.UNPAID }),
      FeeInvoice.countDocuments({ schoolId, status: FEE_STATUS.PAID }),
      FeeInvoice.countDocuments({ schoolId, status: FEE_STATUS.OVERDUE }),
    ]);
    return {
      title: 'Bảng điều khiển Kế toán',
      stats: [
        { key: 'unpaid', label: 'Chưa thanh toán', value: unpaid },
        { key: 'paid', label: 'Đã thanh toán', value: paid },
        { key: 'overdue', label: 'Quá hạn', value: overdue },
      ],
    };
  }
}

class StudentDashboard extends BaseDashboard {
  async build(user) {
    const [grades, attendance, invoices] = await Promise.all([
      Grade.find({ studentId: user._id }).populate('subjectId', 'name code'),
      Attendance.countDocuments({ 'records.studentId': user._id }),
      FeeInvoice.find({ studentId: user._id }).sort({ dueDate: 1 }).limit(5),
    ]);
    return {
      title: 'Bảng điều khiển Học sinh',
      stats: [
        { key: 'subjects', label: 'Môn có điểm', value: grades.length },
        { key: 'attendanceSessions', label: 'Buổi điểm danh', value: attendance },
        { key: 'invoices', label: 'Hóa đơn', value: invoices.length },
      ],
      grades,
      invoices,
    };
  }
}

class ParentDashboard extends BaseDashboard {
  async build(user) {
    const childrenIds = user.parentOf || [];
    const [grades, invoices, leave] = await Promise.all([
      Grade.find({ studentId: { $in: childrenIds } }).populate('subjectId', 'name').populate('studentId', 'name'),
      FeeInvoice.find({ studentId: { $in: childrenIds } }),
      LeaveRequest.countDocuments({ requesterId: user._id }),
    ]);
    return {
      title: 'Bảng điều khiển Phụ huynh',
      stats: [
        { key: 'children', label: 'Con em', value: childrenIds.length },
        { key: 'grades', label: 'Bảng điểm', value: grades.length },
        { key: 'invoices', label: 'Hóa đơn', value: invoices.length },
        { key: 'leaveRequests', label: 'Đơn đã gửi', value: leave },
      ],
      grades,
      invoices,
    };
  }
}

class LibrarianDashboard extends BaseDashboard {
  async build(user) {
    const LibraryBook = require('../models/LibraryBook');
    const BookLoan = require('../models/BookLoan');
    const FacilityRequest = require('../models/FacilityRequest');
    const schoolId = user.schoolId;
    const [books, loans, pendingFacilities] = await Promise.all([
      LibraryBook.countDocuments({ schoolId }),
      BookLoan.countDocuments({ schoolId, status: 'BORROWED' }),
      FacilityRequest.countDocuments({ schoolId, status: 'PENDING' }),
    ]);
    return {
      title: 'Thư viện / CSVC',
      stats: [
        { key: 'books', label: 'Đầu sách', value: books },
        { key: 'loans', label: 'Đang mượn', value: loans },
        { key: 'facilities', label: 'Yêu cầu CSVC chờ duyệt', value: pendingFacilities },
      ],
    };
  }
}

class DefaultDashboard extends BaseDashboard {}

module.exports = DashboardFactory;
