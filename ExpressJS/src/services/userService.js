const ApiError = require('../utils/ApiError');
const { userRepo, schoolRepo } = require('../repositories');
const { hash: hashPassword } = require('./passwordPolicy');
const { isGmailAddress } = require('../utils/gmail');
const { ROLES } = require('../constants/roles');
const { STATUS } = require('../constants/status');
const Role = require('../models/Role');
const roleCache = require('./rolePermissionCache');
const { assertCanManageLevel, getActorLevel, canManageLevel } = require('./roleService');
const { visibleRole } = require('./roleService');
const { targetSchool, reference } = require('./writeScope');
const Class = require('../models/Class');
const Cluster = require('../models/Cluster');
const User = require('../models/User');
const { objectId } = require('./dataScope');
const { assertWithinLimits } = require('./subscriptionService');

const validateUserReferences = async (actor, target) => {
  const role = await roleCache.getRole(target.role);
  if (!role) throw new ApiError(403, 'Vai trò không tồn tại');
  if (target.role === ROLES.SUPER_ADMIN) {
    if (actor.role !== ROLES.SUPER_ADMIN) throw new ApiError(403, 'Chỉ Super Admin');
    target.schoolId = null; target.clusterId = null;
  } else if (target.role === ROLES.CLUSTER_ADMIN) {
    if (!target.clusterId || !(await Cluster.exists({ _id: objectId(target.clusterId) }))) throw new ApiError(400, 'Cụm không tồn tại');
    if (actor.role !== ROLES.SUPER_ADMIN && String(target.clusterId) !== String(actor.clusterId)) throw new ApiError(403, 'Ngoài cụm');
    target.schoolId = null;
  } else {
    target.schoolId = await targetSchool(actor, target.schoolId);
    target.clusterId = (await schoolRepo.findById(target.schoolId)).clusterId;
  }
  if (!visibleRole(target, role)) throw new ApiError(403, 'Vai trò không thuộc phạm vi tài khoản');
  if (target.classId) await reference(Class, target.classId, target.schoolId);
  if (!Array.isArray(target.parentOf || [])) throw new ApiError(400, 'parentOf phải là danh sách');
  for (const studentId of target.parentOf || []) {
    if (target.role !== ROLES.PARENT) throw new ApiError(400, 'Chỉ phụ huynh được liên kết con');
    await reference(User, studentId, target.schoolId, { role: ROLES.STUDENT });
  }
};

const buildScopeFilter = (actor) => {
  if (actor.role === ROLES.SUPER_ADMIN) return {};
  if (actor.role === ROLES.CLUSTER_ADMIN) {
    return { clusterId: actor.clusterId };
  }
  return { schoolId: actor.schoolId };
};

const assertScope = (actor, target) => {
  if (actor.role === ROLES.SUPER_ADMIN) return;
  if (actor.role === ROLES.CLUSTER_ADMIN) {
    if (String(target.clusterId) !== String(actor.clusterId)) {
      throw new ApiError(403, 'Ngoài phạm vi cụm');
    }
    return;
  }
  if (String(target.schoolId) !== String(actor.schoolId)) {
    throw new ApiError(403, 'Ngoài phạm vi trường');
  }
};

const assertCanManageUser = async (actor, target) => {
  assertScope(actor, target);
  const targetLevel = await roleCache.getRoleLevel(target.role);
  await assertCanManageLevel(actor, targetLevel);
};

const assertAssignableRole = async (actor, roleCode) => {
  const code = String(roleCode || '')
    .toUpperCase()
    .trim();
  const role = await Role.findOne({ code, status: STATUS.ACTIVE }).lean();
  if (role && !visibleRole(actor, role)) throw new ApiError(403, 'Vai trò ngoài phạm vi');
  if (!role) {
    // fallback cache / static
    const cached = await roleCache.getRole(code);
    if (!cached) throw new ApiError(400, 'Vai trò không tồn tại hoặc đã ngưng');
    await assertCanManageLevel(actor, cached.level);
    return cached;
  }
  await assertCanManageLevel(actor, role.level);
  return role;
};

const listUsers = async (actor, query = {}) => {
  const filter = { ...buildScopeFilter(actor) };
  if (query.role) filter.role = query.role;
  if (query.schoolId && actor.role === ROLES.SUPER_ADMIN) filter.schoolId = query.schoolId;
  if (query.q) {
    filter.$or = [
      { name: new RegExp(query.q, 'i') },
      { email: new RegExp(query.q, 'i') },
      { code: new RegExp(query.q, 'i') },
    ];
  }

  // Quản lý user: cấp thấp hơn; admin peer (Super/Cluster/School) thêm cùng cấp
  // (trừ Super Admin xem theo tenant / danh bạ tin nhắn)
  if (query.scope !== 'directory' && actor.role !== ROLES.SUPER_ADMIN) {
    const actorLevel = await getActorLevel(actor);
    const cache = await roleCache.ensureLoaded();
    const managedCodes = [...cache.values()]
      .filter((r) => canManageLevel(actor, actorLevel, r.level))
      .map((r) => r.code);
    if (query.role) {
      if (!managedCodes.includes(String(query.role).toUpperCase())) return [];
      filter.role = String(query.role).toUpperCase();
    } else {
      filter.role = { $in: managedCodes.length ? managedCodes : ['__none__'] };
    }
  }

  const users = await userRepo.find(filter, {
    select: query.scope === 'directory' ? 'name email code role schoolId classId' : '-password',
    populate: [{ path: 'schoolId', select: 'name code' }, { path: 'classId', select: 'name gradeLevel' }],
    limit: Number(query.limit) || 100,
  });

  await roleCache.ensureLoaded();
  return users.map((u) => {
    const obj = typeof u.toObject === 'function' ? u.toObject() : u;
    delete obj.password;
    return {
      ...obj,
      roleLevel: roleCache.getRoleLevelSync(obj.role),
      roleLabel: roleCache.getRoleSync(obj.role)?.name || obj.role,
    };
  });
};

const createUser = async (actor, data) => {
  const {
    name,
    email,
    password,
    role,
    schoolId,
    clusterId,
    phone,
    code,
    classId,
    parentOf,
  } = data;

  if (!name || !email || !role) {
    throw new ApiError(400, 'Thiếu thông tin bắt buộc (name, email, role)');
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (process.env.ALLOW_PASSWORD_LOGIN === 'false' && !isGmailAddress(normalizedEmail)) {
    throw new ApiError(400, 'Chỉ được tạo tài khoản với email Gmail (@gmail.com)');
  }
  if (!password && process.env.ALLOW_PASSWORD_LOGIN !== 'false') {
    throw new ApiError(400, 'Thiếu mật khẩu');
  }

  const roleCode = String(role).toUpperCase().trim();
  await assertAssignableRole(actor, roleCode);

  let resolvedSchoolId = schoolId || null;
  let resolvedClusterId = clusterId || null;

  if (actor.role !== ROLES.SUPER_ADMIN) {
    if (actor.role === ROLES.CLUSTER_ADMIN) {
      resolvedClusterId = actor.clusterId;
      if (resolvedSchoolId) {
        const school = await schoolRepo.findById(resolvedSchoolId);
        if (!school || String(school.clusterId) !== String(actor.clusterId)) {
          throw new ApiError(403, 'Trường không thuộc cụm của bạn');
        }
      }
    } else {
      resolvedSchoolId = actor.schoolId;
      resolvedClusterId = actor.clusterId;
    }
  }

  const target = { role: roleCode, schoolId: resolvedSchoolId, clusterId: resolvedClusterId, classId, parentOf };
  await validateUserReferences(actor, target);
  await assertWithinLimits(target.schoolId, target.role);
  resolvedSchoolId = target.schoolId; resolvedClusterId = target.clusterId;
  const hashed = password ? await hashPassword(password, { email: normalizedEmail }) : null;
  const user = await userRepo.create({
    name,
    email: normalizedEmail,
    password: hashed,
    authProvider: hashed ? (isGmailAddress(normalizedEmail) ? 'both' : 'password') : 'google',
    role: roleCode,
    schoolId: resolvedSchoolId,
    clusterId: resolvedClusterId,
    phone,
    code,
    classId: classId || null,
    parentOf: parentOf || [],
    status: STATUS.ACTIVE,
  });

  return user.toSafeObject();
};

const updateUser = async (actor, id, data) => {
  const existing = await userRepo.findById(id);
  if (!existing) throw new ApiError(404, 'Không tìm thấy người dùng');

  await assertCanManageUser(actor, existing);

  const allowed = [
    'name',
    'email',
    'phone',
    'address',
    'status',
    'classId',
    'parentOf',
    'code',
    'gender',
    'dateOfBirth',
    'avatar',
    'bio',
    'role',
  ];
  if ([ROLES.SUPER_ADMIN, ROLES.CLUSTER_ADMIN, ROLES.SCHOOL_ADMIN].includes(actor.role)) {
    allowed.push('schoolId', 'clusterId');
  }

  const update = {};
  for (const key of allowed) {
    if (data[key] !== undefined) update[key] = data[key];
  }

  if (update.email) {
    update.email = String(update.email).toLowerCase().trim();
  }
  if (update.role) {
    update.role = String(update.role).toUpperCase().trim();
    await assertAssignableRole(actor, update.role);
  }

  const target = { ...existing.toObject(), ...update };
  await validateUserReferences(actor, target);
  if (existing.role === ROLES.STUDENT && String(target.schoolId) !== String(existing.schoolId)) {
    throw new ApiError(400, 'Chuyển trường cần quy trình bảo toàn hồ sơ riêng');
  }
  update.schoolId = target.schoolId;
  update.clusterId = target.clusterId;
  if (existing.role === ROLES.STUDENT && String(existing.classId || '') !== String(target.classId || '')) {
    if (target.role !== ROLES.STUDENT) throw new ApiError(400, 'Không đổi vai trò đồng thời với chuyển lớp');
    const transferred = await require('./studentTransferService').transfer(actor, existing, update, data);
    return transferred.toSafeObject();
  }
  const user = await userRepo.updateById(id, update);
  return user.toSafeObject();
};

const getDefaultPassword = require('./passwordPolicy').temporaryPassword;

const resetPassword = async (actor, id) => {
  const existing = await require('../repositories/authSecurityRepository').load(id);
  if (!existing) throw new ApiError(404, 'Không tìm thấy người dùng');
  await assertCanManageUser(actor, existing);
  const plain = getDefaultPassword();
  const user = await require('./authSecurityService').replacePassword(existing, plain, true);
  return { user: user.toSafeObject(), defaultPassword: plain };
};

const deleteUser = async (actor, id) => {
  const existing = await userRepo.findById(id);
  if (!existing) throw new ApiError(404, 'Không tìm thấy người dùng');
  if (String(existing._id) === String(actor._id)) {
    throw new ApiError(400, 'Không thể xóa chính mình');
  }
  await assertCanManageUser(actor, existing);
  await userRepo.deleteById(id);
  return true;
};

module.exports = {
  listUsers,
  createUser,
  updateUser,
  resetPassword,
  deleteUser,
  getDefaultPassword,
};
