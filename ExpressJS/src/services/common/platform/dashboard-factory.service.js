const { ROLES } = require("../../../config/constants/roles.config");
const { FEE_STATUS, LEAVE_STATUS } = require("../../../config/constants/status.config");

/**
 * Factory Pattern — build dashboard payload per role
 */
class DashboardFactory {
  constructor(dependencies) {
    this.persistence = dependencies.repositories.dashboard;
    this.dataScope = dependencies.services["data-scope"];
    this.create = this.create.bind(this);
  }

  create(role) {
    const dependencies = [this.persistence, this.dataScope];
    switch (role) {
      case ROLES.SUPER_ADMIN:
        return new SuperAdminDashboard(...dependencies);
      case ROLES.CLUSTER_ADMIN:
        return new ClusterAdminDashboard(...dependencies);
      case ROLES.SCHOOL_ADMIN:
        return new SchoolAdminDashboard(...dependencies);
      case ROLES.ACADEMIC_AFFAIRS:
        return new AcademicAffairsDashboard(...dependencies);
      case ROLES.SUBJECT_TEACHER:
      case ROLES.HOMEROOM_TEACHER:
        return new TeacherDashboard(...dependencies);
      case ROLES.ACCOUNTANT:
        return new AccountantDashboard(...dependencies);
      case ROLES.STUDENT:
        return new StudentDashboard(...dependencies);
      case ROLES.PARENT:
        return new ParentDashboard(...dependencies);
      case ROLES.LIBRARIAN:
        return new LibrarianDashboard(...dependencies);
      default:
        return new DefaultDashboard(...dependencies);
    }
  }
}

class BaseDashboard {
  constructor(persistence, dataScope) {
    this.persistence = persistence;
    this.dataScope = dataScope;
  }

  async build(_user) {
    return { title: 'Dashboard', stats: [], widgets: [] };
  }
}

class SuperAdminDashboard extends BaseDashboard {
  async build() {
    const [schools, users, clusters, announcements] = await Promise.all([
      this.persistence.count('school'),
      this.persistence.count('user'),
      this.persistence.count('cluster'),
      this.persistence.count('announcement', { scope: 'SYSTEM' }),
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
    const schools = await this.persistence.findSchools({ clusterId: user.clusterId });
    const schoolIds = schools.map((s) => s._id);
    const [users, unpaid] = await Promise.all([
      this.persistence.count('user', { schoolId: { $in: schoolIds } }),
      this.persistence.count('fee-invoice', { schoolId: { $in: schoolIds }, status: { $in: [FEE_STATUS.UNPAID, FEE_STATUS.OVERDUE] } }),
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
      this.persistence.count('user', { schoolId, role: ROLES.STUDENT }),
      this.persistence.count('user', {
        schoolId,
        role: { $in: [ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER] },
      }),
      this.persistence.count('class', { schoolId }),
      this.persistence.count('leave-request', { schoolId, status: LEAVE_STATUS.PENDING }),
      this.persistence.count('fee-invoice', { schoolId, status: { $in: [FEE_STATUS.UNPAID, FEE_STATUS.OVERDUE] } }),
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
    const scope = await this.dataScope.schoolScope(user);
    const attendanceCount = await this.persistence.count('attendance', { $and: [scope, await this.dataScope.teacherClassScope(user, 'attendance'), { teacherId: user._id }] });
    const gradeCount = await this.persistence.count('grade', { $and: [scope, await this.dataScope.teacherClassScope(user, 'grades'), { teacherId: user._id }] });
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
      this.persistence.count('fee-invoice', { schoolId, status: FEE_STATUS.UNPAID }),
      this.persistence.count('fee-invoice', { schoolId, status: FEE_STATUS.PAID }),
      this.persistence.count('fee-invoice', { schoolId, status: FEE_STATUS.OVERDUE }),
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
    const scope = await this.dataScope.schoolScope(user);
    const studentIds = await this.dataScope.personalStudentIds(user);
    const [grades, attendance, invoices] = await Promise.all([
      this.persistence.findGrades({ ...scope, studentId: { $in: studentIds } }, [['subjectId', 'name code']]),
      this.persistence.count('attendance', { ...scope, 'records.studentId': { $in: studentIds } }),
      this.persistence.findInvoices({ ...scope, studentId: { $in: studentIds } }, { sort: { dueDate: 1 }, limit: 5 }),
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
    const scope = await this.dataScope.schoolScope(user);
    const childrenIds = await this.dataScope.personalStudentIds(user);
    const [grades, invoices, leave] = await Promise.all([
      this.persistence.findGrades({ ...scope, studentId: { $in: childrenIds } }, [['subjectId', 'name'], ['studentId', 'name']]),
      this.persistence.findInvoices({ ...scope, studentId: { $in: childrenIds } }),
      this.persistence.count('leave-request', { ...scope, requesterId: user._id }),
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
    const schoolId = user.schoolId;
    const [books, loans, pendingFacilities] = await Promise.all([
      this.persistence.count('library-book', { schoolId }),
      this.persistence.count('book-loan', { schoolId, status: 'BORROWED' }),
      this.persistence.count('facility-request', { schoolId, status: 'PENDING' }),
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
