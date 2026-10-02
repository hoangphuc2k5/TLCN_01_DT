function createDashboardService(dependencies) {
  const persistence = dependencies.persistence;
  const dashboardFactory = dependencies.services["dashboard-factory"];
  const { notificationRepo } = dependencies.repositories["shared"];
  const ApiError = require("../../../utils/common/http/api-error.util");
  const cache = dependencies.services["role-permission-cache"];
  const { ROLES } = require("../../../config/constants/roles.config");
  const { buildDashboardAnalytics } = dependencies.services["dashboard-analytics"];
  
  const statResources = {
    schools: 'schools', users: 'users', clusters: 'clusters', systemAnnouncements: 'announcements',
    students: 'users', teachers: 'users', classes: 'classes', pendingLeave: 'leave',
    unpaid: 'fees', paid: 'fees', overdue: 'fees', invoices: 'fees',
    attendanceSessions: 'attendance', gradeSheets: 'grades', subjects: 'grades', grades: 'grades',
    assignments: 'assignments',
    children: 'own_data', books: 'library', loans: 'library', facilities: 'facilities',
  };
  
  const getDashboard = async (user) => {
    const builder = dashboardFactory.create(user.role);
    const dashboard = await builder.build(user);
    const personal = [ROLES.STUDENT, ROLES.PARENT].includes(user.role);
    const teacher = [ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER].includes(user.role);
    const permissions = new Map(await Promise.all([...new Set(Object.values(statResources))].map(async resource => {
      const allowed = personal
        ? await cache.canAccess(user.role, 'own_data', 'view')
        : await cache.canAccess(user.role, resource, 'view') ||
          (!teacher && ['grades', 'attendance', 'fees'].includes(resource) && await cache.canAccess(user.role, 'reports', 'view'));
      return [resource, allowed];
    })));
    // Own leave requests remain available to every authenticated requester.
    dashboard.stats = (dashboard.stats || []).filter(s => s.key === 'leaveRequests' || permissions.get(statResources[s.key]));
    for (const [key, resource] of Object.entries({ grades: 'grades', invoices: 'fees', schools: 'schools' })) {
      if (!permissions.get(resource)) delete dashboard[key];
    }
    dashboard.analytics = await buildDashboardAnalytics(user, Object.fromEntries(
      ['attendance', 'fees', 'grades', 'assignments'].map(resource => [resource, permissions.get(resource)])
    ));
    return dashboard;
  };
  
  const listNotifications = async (user) => {
    return persistence.listNotificationsFind({ userId: user._id }, { sort: { createdAt: -1 }, limit: 50 });
  };
  
  const markRead = async (user, id) => {
    const n = await persistence.nFindById(id);
    if (!n) throw new ApiError(404, 'Không tìm thấy thông báo');
    if (String(n.userId) !== String(user._id)) throw new ApiError(403, 'Không có quyền');
    return persistence.markReadUpdateById(id, { isRead: true });
  };
  
  const markAllRead = async (user) => {
    await persistence.markAllReadUpdateMany({ userId: user._id, isRead: false }, { isRead: true });
    return true;
  };
  
  return { getDashboard, listNotifications, markRead, markAllRead };
  
}

class DashboardService {
  constructor(dependencies) {
    Object.assign(this, createDashboardService(dependencies));
  }
}

module.exports = DashboardService;
