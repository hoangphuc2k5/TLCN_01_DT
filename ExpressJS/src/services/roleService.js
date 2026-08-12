const ApiError = require('../utils/ApiError');
const Role = require('../models/Role');
const User = require('../models/User');
const roleCache = require('./rolePermissionCache');
const {
  RESOURCES,
  ACTIONS,
  DEFAULT_ROLE_LEVELS,
  legacyPermissionsToEntries,
  mergePermissionEntries,
} = require('../constants/permissionCatalog');
const { ROLE_PERMISSIONS } = require('../constants/permissions');
const { ROLE_LABELS, ROLES } = require('../constants/roles');
const { STATUS } = require('../constants/status');

/** Admin được quản lý tài khoản / role cùng cấp */
const PEER_MANAGE_ROLES = [ROLES.SUPER_ADMIN, ROLES.CLUSTER_ADMIN, ROLES.SCHOOL_ADMIN];

const allowsPeerManage = (actor) => PEER_MANAGE_ROLES.includes(actor.role);

const getActorLevel = async (actor) => roleCache.getRoleLevel(actor.role);

/** actor.level < target (thấp hơn), hoặc <= nếu admin peer */
const canManageLevel = (actor, actorLevel, targetLevel) => {
  if (allowsPeerManage(actor)) return actorLevel <= targetLevel;
  return actorLevel < targetLevel;
};

const assertCanManageLevel = async (actor, targetLevel) => {
  const actorLevel = await getActorLevel(actor);
  if (!canManageLevel(actor, actorLevel, targetLevel)) {
    throw new ApiError(
      403,
      allowsPeerManage(actor)
        ? 'Chỉ được quản lý vai trò / tài khoản cùng cấp hoặc thấp hơn'
        : 'Chỉ được quản lý vai trò / tài khoản cấp thấp hơn'
    );
  }
};

const listRoles = async (actor, query = {}) => {
  await roleCache.ensureLoaded();
  const actorLevel = await getActorLevel(actor);
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.q) {
    filter.$or = [
      { name: new RegExp(query.q, 'i') },
      { code: new RegExp(query.q, 'i') },
    ];
  }

  let roles = await Role.find(filter).sort({ level: 1, code: 1 }).lean();
  if (!roles.length) {
    roles = Array.from((await roleCache.ensureLoaded()).values());
  }

  // Chỉ vai trò ngang cấp (admin peer) hoặc thấp hơn
  roles = roles.filter((r) => canManageLevel(actor, actorLevel, r.level));

  return roles.map(roleCache.normalizeRoleDoc);
};

const listAssignableRoles = async (actor) => {
  const actorLevel = await getActorLevel(actor);
  await roleCache.ensureLoaded();
  const roles = await Role.find({ status: STATUS.ACTIVE }).sort({ level: 1 }).lean();
  return roles
    .filter((r) => canManageLevel(actor, actorLevel, r.level))
    .map(roleCache.normalizeRoleDoc);
};

const getPermissionCatalog = () => ({
  resources: RESOURCES,
  actions: ACTIONS,
});

const createRole = async (actor, data) => {
  const actorLevel = await getActorLevel(actor);
  if (!(await roleCache.canAccess(actor.role, 'roles', 'create')) && actor.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Không có quyền tạo vai trò');
  }

  const code = String(data.code || '')
    .toUpperCase()
    .trim();
  const name = String(data.name || '').trim();
  const level = Number(data.level);

  if (!code || !name || Number.isNaN(level)) {
    throw new ApiError(400, 'Thiếu code/name/level');
  }
  if (!canManageLevel(actor, actorLevel, level)) {
    throw new ApiError(
      403,
      allowsPeerManage(actor)
        ? 'Level phải cùng cấp hoặc thấp hơn (số lớn hơn hoặc bằng) cấp của bạn'
        : 'Level phải thấp hơn (số lớn hơn) cấp của bạn'
    );
  }
  if (await Role.findOne({ code })) {
    throw new ApiError(400, 'Mã vai trò đã tồn tại');
  }

  const permissions = mergePermissionEntries(data.permissions || []);
  const role = await Role.create({
    code,
    name,
    description: data.description || '',
    level,
    isSystem: false,
    status: data.status || STATUS.ACTIVE,
    permissions,
  });
  roleCache.invalidate();
  await roleCache.reload();
  return roleCache.normalizeRoleDoc(role);
};

const updateRole = async (actor, id, data) => {
  const role = await Role.findById(id);
  if (!role) throw new ApiError(404, 'Không tìm thấy vai trò');

  await assertCanManageLevel(actor, role.level);

  if (!(await roleCache.canAccess(actor.role, 'roles', 'update')) && actor.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Không có quyền sửa vai trò');
  }

  const actorLevel = await getActorLevel(actor);

  if (data.name !== undefined) role.name = String(data.name).trim();
  if (data.description !== undefined) role.description = data.description;
  if (data.status !== undefined) role.status = data.status;
  if (data.permissions !== undefined) {
    role.permissions = mergePermissionEntries(data.permissions);
  }
  if (data.level !== undefined) {
    const level = Number(data.level);
    if (!canManageLevel(actor, actorLevel, level)) {
      throw new ApiError(
        403,
        allowsPeerManage(actor)
          ? 'Level phải cùng cấp hoặc thấp hơn cấp của bạn'
          : 'Level phải thấp hơn cấp của bạn'
      );
    }
    role.level = level;
  }
  // System roles: cannot change code
  if (!role.isSystem && data.code !== undefined) {
    throw new ApiError(400, 'Không đổi mã vai trò sau khi tạo');
  }

  await role.save();
  roleCache.invalidate();
  await roleCache.reload();
  return roleCache.normalizeRoleDoc(role);
};

const deleteRole = async (actor, id) => {
  const role = await Role.findById(id);
  if (!role) throw new ApiError(404, 'Không tìm thấy vai trò');
  if (role.isSystem) throw new ApiError(400, 'Không thể xóa vai trò hệ thống');

  await assertCanManageLevel(actor, role.level);

  if (!(await roleCache.canAccess(actor.role, 'roles', 'delete')) && actor.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Không có quyền xóa vai trò');
  }

  const inUse = await User.countDocuments({ role: role.code });
  if (inUse > 0) {
    throw new ApiError(400, `Còn ${inUse} người dùng đang dùng vai trò này`);
  }

  await Role.findByIdAndDelete(id);
  roleCache.invalidate();
  await roleCache.reload();
  return true;
};

const seedSystemRoles = async ({ force = false } = {}) => {
  for (const [code, legacyKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const existing = await Role.findOne({ code });
    if (existing && !force) {
      // giữ permissions đã chỉnh trên role hệ thống; chỉ đảm bảo metadata
      let dirty = false;
      if (!existing.isSystem) {
        existing.isSystem = true;
        dirty = true;
      }
      if (existing.level == null) {
        existing.level = DEFAULT_ROLE_LEVELS[code] ?? 100;
        dirty = true;
      }
      if (dirty) await existing.save();
      continue;
    }

    const permissions = legacyPermissionsToEntries(legacyKeys);
    if ([ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.CLUSTER_ADMIN].includes(code)) {
      permissions.push({ resource: 'roles', actions: ['view', 'create', 'update', 'delete'] });
    }
    await Role.findOneAndUpdate(
      { code },
      {
        code,
        name: ROLE_LABELS[code] || code,
        description: 'Vai trò hệ thống',
        level: DEFAULT_ROLE_LEVELS[code] ?? 100,
        isSystem: true,
        status: STATUS.ACTIVE,
        permissions: mergePermissionEntries(permissions),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  roleCache.invalidate();
  await roleCache.reload();
};

module.exports = {
  listRoles,
  listAssignableRoles,
  getPermissionCatalog,
  createRole,
  updateRole,
  deleteRole,
  seedSystemRoles,
  getActorLevel,
  assertCanManageLevel,
  canManageLevel,
  allowsPeerManage,
  PEER_MANAGE_ROLES,
};
