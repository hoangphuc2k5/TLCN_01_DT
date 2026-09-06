export const can = (user, resource, action = 'view') => {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  return (user.permissionEntries || []).some(p => p.resource === resource && (p.actions || []).includes(action));
};

export const sameId = (a, b) => !!a && !!b && String(a._id || a) === String(b._id || b);

export const ownsRole = (user, role) => {
  if (user?.role === 'SUPER_ADMIN') return true;
  if (!role || role.isSystem) return false;
  if (user?.role === 'CLUSTER_ADMIN') return !role.schoolId && sameId(role.clusterId, user.clusterId);
  return sameId(role.schoolId, user?.schoolId);
};

export const canExport = (user, resource) => {
  if (!['grades', 'fees', 'attendance'].includes(resource)) return false;
  if (['STUDENT', 'PARENT'].includes(user?.role)) return can(user, 'own_data');
  if (['SUBJECT_TEACHER', 'HOMEROOM_TEACHER'].includes(user?.role)) return can(user, resource);
  return can(user, resource) || can(user, 'reports');
};

const resources = {
  clusters: 'clusters', users: 'users', roles: 'roles', subscriptions: 'subscriptions',
  classes: 'classes', attendance: 'attendance', grades: 'grades', fees: 'fees',
  exams: 'exams', materials: 'materials', library: 'library', facilities: 'facilities',
  'audit-logs': 'audit', support: 'support', conduct: 'conduct', templates: 'templates',
};
const common = new Set(['dashboard', 'profile', 'messages', 'calendar', 'announcements', 'leave', 'timetable', 'schools']);
const personal = new Set(['grades', 'attendance', 'fees', 'exams', 'materials', 'library', 'conduct']);

export const canVisit = (user, pathname) => {
  if (!user) return false;
  const page = pathname.split('/').filter(Boolean)[0] || 'dashboard';
  if (common.has(page)) return true;
  if (canExport(user, page)) return true;
  if (can(user, resources[page])) return true;
  if (['STUDENT', 'PARENT'].includes(user.role) && personal.has(page)) return can(user, 'own_data');
  if (page === 'classes' && ['SUBJECT_TEACHER', 'HOMEROOM_TEACHER'].includes(user.role)) return can(user, 'own_data');
  if (['fees', 'subscriptions'].includes(page) && user.role === 'CLUSTER_ADMIN') return can(user, 'reports');
  return false;
};
