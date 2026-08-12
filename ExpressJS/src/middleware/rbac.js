const ApiError = require('../utils/ApiError');
const { hasPermission, hasPermissionAsync } = require('../constants/permissions');

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
      // sync fallback
      ok = permissions.some((p) => hasPermission(req.user.role, p));
    }
    if (!ok) {
      return next(new ApiError(403, 'Bạn không có quyền thực hiện thao tác này', 403));
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authorizeRoles, authorizePermission };
