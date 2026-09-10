const DashboardFactory = require('../patterns/dashboardFactory');
const { notificationRepo } = require('../repositories');
const ApiError = require('../utils/ApiError');
const cache = require('./rolePermissionCache');
const { ROLES } = require('../constants/roles');

const statResources = {
  schools: 'schools', users: 'users', clusters: 'clusters', systemAnnouncements: 'announcements',
  students: 'users', teachers: 'users', classes: 'classes', pendingLeave: 'leave',
  unpaid: 'fees', paid: 'fees', overdue: 'fees', invoices: 'fees',
  attendanceSessions: 'attendance', gradeSheets: 'grades', subjects: 'grades', grades: 'grades',
  children: 'own_data', books: 'library', loans: 'library', facilities: 'facilities',
};

const getDashboard = async (user) => {
  const builder = DashboardFactory.create(user.role);
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
  return dashboard;
};

const listNotifications = async (user) => {
  return notificationRepo.find(
    { userId: user._id },
    { sort: { createdAt: -1 }, limit: 50 }
  );
};

const markRead = async (user, id) => {
  const n = await notificationRepo.findById(id);
  if (!n) throw new ApiError(404, 'Không tìm thấy thông báo');
  if (String(n.userId) !== String(user._id)) throw new ApiError(403, 'Không có quyền');
  return notificationRepo.updateById(id, { isRead: true });
};

const markAllRead = async (user) => {
  await require('../models/Notification').updateMany(
    { userId: user._id, isRead: false },
    { isRead: true }
  );
  return true;
};

module.exports = { getDashboard, listNotifications, markRead, markAllRead };
