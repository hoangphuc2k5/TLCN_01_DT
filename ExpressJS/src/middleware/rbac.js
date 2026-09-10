const ApiError = require('../utils/ApiError');
const { hasPermissionAsync } = require('../constants/permissions');

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Chưa xác thực', 401));
  }
  if (!roles.includes(req.user.role)) {
    return next(new ApiError(403, 'Bạn không có quyền thực hiện thao tác này', 403));
  }
  next();
};

const authorizePermission = (...permissions) => async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Chưa xác thực', 401));
    }
    let ok = false;
    for (const p of permissions) {
      // eslint-disable-next-line no-await-in-loop
      if (await hasPermissionAsync(req.user.role, p)) {
        ok = true;
        break;
      }
    }

    if (!ok) {
      return next(new ApiError(403, 'Bạn không có quyền thực hiện thao tác này', 403));
    }
    next();
  } catch (err) {
    next(err);
  }
};

// Explicit action checks avoid requiring create/update/delete for read-only roles.
const authorizePermissionAction = (actions, ...permissions) => async (req, res, next) => {
  try {
    if (!req.user) throw new ApiError(401, 'Chưa xác thực', 401);
    const { LEGACY_PERMISSION_MAP } = require('../constants/permissionCatalog');
    const cache = require('../services/rolePermissionCache');
    const required = Array.isArray(actions) ? actions : [actions];
    for (const permission of permissions) {
      const mapping = LEGACY_PERMISSION_MAP[permission];
      if (!mapping || !required.length || !required.every(a => mapping.actions.includes(a))) continue;
      const checks = await Promise.all(required.map(a => cache.canAccess(req.user.role, mapping.resource, a)));
      if (checks.every(Boolean)) return next();
    }
    throw new ApiError(403, 'Không có quyền thực hiện thao tác này', 403);
  } catch (error) { next(error); }
};

const authorizeRead = (resource, { personal = false, personalRoles = ['STUDENT', 'PARENT'] } = {}) => async (req, _res, next) => {
  try {
    if (!req.user) throw new ApiError(401, 'Chưa xác thực');
    const cache = require('../services/rolePermissionCache');
    const own = personal && personalRoles.includes(req.user.role) && await cache.canAccess(req.user.role, 'own_data', 'view');
    if (!own && !(await cache.canAccess(req.user.role, resource, 'view'))) throw new ApiError(403, 'Không có quyền xem');
    next();
  } catch (error) { next(error); }
};
module.exports = { authorizeRoles, authorizePermission, authorizePermissionAction, authorizeRead };
