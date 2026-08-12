export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CLUSTER_ADMIN: 'CLUSTER_ADMIN',
  SCHOOL_ADMIN: 'SCHOOL_ADMIN',
  ACADEMIC_AFFAIRS: 'ACADEMIC_AFFAIRS',
  SUBJECT_TEACHER: 'SUBJECT_TEACHER',
  HOMEROOM_TEACHER: 'HOMEROOM_TEACHER',
  ACCOUNTANT: 'ACCOUNTANT',
  LIBRARIAN: 'LIBRARIAN',
  STUDENT: 'STUDENT',
  PARENT: 'PARENT',
};

export const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  CLUSTER_ADMIN: 'Quản lý cụm',
  SCHOOL_ADMIN: 'Hiệu trưởng',
  ACADEMIC_AFFAIRS: 'Giáo vụ',
  SUBJECT_TEACHER: 'GV bộ môn',
  HOMEROOM_TEACHER: 'GV chủ nhiệm',
  ACCOUNTANT: 'Kế toán',
  LIBRARIAN: 'Thủ thư/CSVC',
  STUDENT: 'Học sinh',
  PARENT: 'Phụ huynh',
};

/** Super / Cluster / School Admin được quản lý cùng cấp */
export const PEER_MANAGE_ROLES = [ROLES.SUPER_ADMIN, ROLES.CLUSTER_ADMIN, ROLES.SCHOOL_ADMIN];

export const canManageLevel = (actorRole, actorLevel, targetLevel) => {
  if (PEER_MANAGE_ROLES.includes(actorRole)) return actorLevel <= targetLevel;
  return actorLevel < targetLevel;
};
