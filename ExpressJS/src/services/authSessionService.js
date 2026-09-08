const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const { listLegacyPermissionsForRole } = require('../constants/permissions');
const { ROLE_LABELS } = require('../constants/roles');
const roleCache = require('./rolePermissionCache');

async function buildAuthPayload(user) {
  const role = await roleCache.getRole(user.role);
  if (!role || !require('./roleService').visibleRole(user, role)) throw new ApiError(403, 'Vai trò không hợp lệ hoặc ngoài phạm vi tài khoản');
  const permissions = await listLegacyPermissionsForRole(user.role);
  return {
    access_token: jwt.sign({
      purpose: 'access', sessionVersion: user.security?.sessionVersion || 0,
      _id: user._id, email: user.email, name: user.name, role: user.role,
      schoolId: user.schoolId, clusterId: user.clusterId,
    }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRE || '1d' }),
    mustChangePassword: !!user.security?.mustChangePassword,
    user: {
      ...user.toSafeObject(), mustChangePassword: !!user.security?.mustChangePassword,
      roleLabel: role.name || ROLE_LABELS[user.role] || user.role,
      roleLevel: role.level ?? (await roleCache.getRoleLevel(user.role)),
      permissions, permissionEntries: role.permissions || [],
    },
  };
}
module.exports = { buildAuthPayload };
