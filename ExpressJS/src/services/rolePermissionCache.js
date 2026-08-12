const Role = require('../models/Role');
const { STATUS } = require('../constants/status');
const {
  DEFAULT_ROLE_LEVELS,
  legacyPermissionsToEntries,
  hasResourceAction,
  entriesSatisfyLegacy,
} = require('../constants/permissionCatalog');
const { ROLE_LABELS, ROLES } = require('../constants/roles');

let cacheByCode = new Map();
let loaded = false;

const getStaticRolePermissions = () => {
  // lazy to avoid circular require with permissions.js
  return require('../constants/permissions').ROLE_PERMISSIONS;
};

const normalizeRoleDoc = (doc) => {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    _id: obj._id,
    code: obj.code,
    name: obj.name,
    description: obj.description || '',
    level: obj.level,
    isSystem: !!obj.isSystem,
    status: obj.status,
    permissions: obj.permissions || [],
  };
};

const reload = async () => {
  const roles = await Role.find({ status: STATUS.ACTIVE }).lean();
  const next = new Map();
  for (const r of roles) {
    next.set(r.code, normalizeRoleDoc(r));
  }
  if (next.size === 0) {
    const ROLE_PERMISSIONS = getStaticRolePermissions();
    for (const [code, legacyKeys] of Object.entries(ROLE_PERMISSIONS)) {
      next.set(code, {
        code,
        name: ROLE_LABELS[code] || code,
        description: '',
        level: DEFAULT_ROLE_LEVELS[code] ?? 100,
        isSystem: true,
        status: STATUS.ACTIVE,
        permissions: legacyPermissionsToEntries(legacyKeys),
      });
    }
  }
  cacheByCode = next;
  loaded = true;
  return cacheByCode;
};

const ensureLoaded = async () => {
  if (!loaded) await reload();
  return cacheByCode;
};

const getRoleSync = (code) => cacheByCode.get(code) || null;

const getRole = async (code) => {
  await ensureLoaded();
  return cacheByCode.get(code) || null;
};

const getRoleLevel = async (code) => {
  const role = await getRole(code);
  if (role) return role.level;
  return DEFAULT_ROLE_LEVELS[code] ?? 999;
};

const getRoleLevelSync = (code) => {
  const role = getRoleSync(code);
  if (role) return role.level;
  return DEFAULT_ROLE_LEVELS[code] ?? 999;
};

const getRolePermissions = async (code) => {
  const role = await getRole(code);
  return role?.permissions || [];
};

const hasPermissionLegacy = async (roleCode, legacyPermission) => {
  if (roleCode === ROLES.SUPER_ADMIN) return true;
  const entries = await getRolePermissions(roleCode);
  return entriesSatisfyLegacy(entries, legacyPermission);
};

const hasPermissionLegacySync = (roleCode, legacyPermission) => {
  if (roleCode === ROLES.SUPER_ADMIN) return true;
  if (!loaded) {
    const ROLE_PERMISSIONS = getStaticRolePermissions();
    return (ROLE_PERMISSIONS[roleCode] || []).includes(legacyPermission);
  }
  const role = getRoleSync(roleCode);
  if (!role) {
    const ROLE_PERMISSIONS = getStaticRolePermissions();
    return (ROLE_PERMISSIONS[roleCode] || []).includes(legacyPermission);
  }
  return entriesSatisfyLegacy(role.permissions, legacyPermission);
};

const canAccess = async (roleCode, resource, action) => {
  if (roleCode === ROLES.SUPER_ADMIN) return true;
  const entries = await getRolePermissions(roleCode);
  return hasResourceAction(entries, resource, action);
};

const invalidate = () => {
  loaded = false;
  cacheByCode = new Map();
};

module.exports = {
  reload,
  ensureLoaded,
  getRole,
  getRoleSync,
  getRoleLevel,
  getRoleLevelSync,
  getRolePermissions,
  hasPermissionLegacy,
  hasPermissionLegacySync,
  canAccess,
  invalidate,
  normalizeRoleDoc,
};
