const ACTIONS = ['view', 'create', 'update', 'delete', 'execute'];

const RESOURCES = [
  { key: 'clusters', label: 'Cụm trường' },
  { key: 'schools', label: 'Trường học' },
  { key: 'users', label: 'Người dùng' },
  { key: 'roles', label: 'Vai trò / Phân quyền' },
  { key: 'classes', label: 'Lớp & cấu trúc học vụ' },
  { key: 'timetable', label: 'Thời khóa biểu' },
  { key: 'attendance', label: 'Điểm danh' },
  { key: 'grades', label: 'Điểm số' },
  { key: 'fees', label: 'Học phí' },
  { key: 'announcements', label: 'Thông báo' },
  { key: 'leave', label: 'Đơn từ' },
  { key: 'exams', label: 'Thi online' },
  { key: 'materials', label: 'Học liệu' },
  { key: 'library', label: 'Thư viện' },
  { key: 'facilities', label: 'CSVC' },
  { key: 'conduct', label: 'Hạnh kiểm' },
  { key: 'audit', label: 'Nhật ký hệ thống' },
  { key: 'support', label: 'Hỗ trợ kỹ thuật' },
  { key: 'templates', label: 'Mẫu dùng chung' },
  { key: 'subscriptions', label: 'Gói dịch vụ' },
  { key: 'reports', label: 'Báo cáo' },
  { key: 'own_data', label: 'Dữ liệu cá nhân' },
];

/** Legacy flat permission → resource/actions */
const LEGACY_PERMISSION_MAP = {
  MANAGE_TENANTS: { resource: 'schools', actions: ['view', 'create', 'update', 'delete'] },
  MANAGE_CLUSTERS: { resource: 'clusters', actions: ['view', 'create', 'update', 'delete'] },
  MANAGE_USERS: { resource: 'users', actions: ['view', 'create', 'update', 'delete'] },
  MANAGE_STRUCTURE: { resource: 'classes', actions: ['view', 'create', 'update', 'delete'] },
  MANAGE_TIMETABLE: { resource: 'timetable', actions: ['view', 'create', 'update', 'delete', 'execute'] },
  TAKE_ATTENDANCE: { resource: 'attendance', actions: ['view', 'create', 'update', 'execute'] },
  ENTER_GRADES: { resource: 'grades', actions: ['view', 'create', 'update'] },
  MANAGE_FEES: { resource: 'fees', actions: ['view', 'create', 'update', 'delete', 'execute'] },
  MANAGE_ANNOUNCEMENTS: { resource: 'announcements', actions: ['view', 'create', 'update', 'delete'] },
  MANAGE_LEAVE: { resource: 'leave', actions: ['view', 'create', 'update', 'execute'] },
  VIEW_REPORTS: { resource: 'reports', actions: ['view'] },
  VIEW_OWN_DATA: { resource: 'own_data', actions: ['view', 'update'] },
  MANAGE_SUBSCRIPTIONS: { resource: 'subscriptions', actions: ['view', 'create', 'update', 'delete', 'execute'] },
  MANAGE_EXAMS: { resource: 'exams', actions: ['view', 'create', 'update', 'delete'] },
  TAKE_EXAMS: { resource: 'exams', actions: ['view', 'execute'] },
  MANAGE_MATERIALS: { resource: 'materials', actions: ['view', 'create', 'update', 'delete'] },
  MANAGE_LIBRARY: { resource: 'library', actions: ['view', 'create', 'update', 'delete', 'execute'] },
  MANAGE_FACILITIES: { resource: 'facilities', actions: ['view', 'create', 'update', 'execute'] },
  VIEW_AUDIT: { resource: 'audit', actions: ['view'] },
  MANAGE_SUPPORT: { resource: 'support', actions: ['view', 'create', 'update', 'execute'] },
  MANAGE_CONDUCT: { resource: 'conduct', actions: ['view', 'create', 'update'] },
  MANAGE_TEMPLATES: { resource: 'templates', actions: ['view', 'create', 'update', 'delete', 'execute'] },
  MANAGE_ROLES: { resource: 'roles', actions: ['view', 'create', 'update', 'delete'] },
};

const DEFAULT_ROLE_LEVELS = {
  SUPER_ADMIN: 0,
  CLUSTER_ADMIN: 10,
  SCHOOL_ADMIN: 20,
  ACADEMIC_AFFAIRS: 30,
  HOMEROOM_TEACHER: 40,
  SUBJECT_TEACHER: 40,
  ACCOUNTANT: 50,
  LIBRARIAN: 50,
  STUDENT: 60,
  PARENT: 60,
};

const mergePermissionEntries = (entries) => {
  const map = new Map();
  for (const entry of entries) {
    if (!entry?.resource) continue;
    const existing = map.get(entry.resource) || new Set();
    (entry.actions || []).forEach((a) => existing.add(a));
    map.set(entry.resource, existing);
  }
  return Array.from(map.entries()).map(([resource, actions]) => ({
    resource,
    actions: ACTIONS.filter((a) => actions.has(a)),
  }));
};

const legacyPermissionsToEntries = (legacyKeys = []) => {
  const entries = [];
  for (const key of legacyKeys) {
    const mapped = LEGACY_PERMISSION_MAP[key];
    if (mapped) entries.push(mapped);
  }
  // Always give roles managers roles resource when they have MANAGE_USERS at school+ level
  return mergePermissionEntries(entries);
};

const hasResourceAction = (permissionEntries, resource, action) => {
  const entry = (permissionEntries || []).find((p) => p.resource === resource);
  if (!entry) return false;
  return (entry.actions || []).includes(action);
};

const entriesSatisfyLegacy = (permissionEntries, legacyKey) => {
  const mapped = LEGACY_PERMISSION_MAP[legacyKey];
  if (!mapped) return false;
  return mapped.actions.every((action) => hasResourceAction(permissionEntries, mapped.resource, action));
};

module.exports = {
  ACTIONS,
  RESOURCES,
  LEGACY_PERMISSION_MAP,
  DEFAULT_ROLE_LEVELS,
  mergePermissionEntries,
  legacyPermissionsToEntries,
  hasResourceAction,
  entriesSatisfyLegacy,
};
