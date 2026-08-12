const { ROLES } = require('../constants/roles');
const ApiError = require('../utils/ApiError');

/**
 * Tenant isolation middleware
 * Injects req.tenantFilter based on role scope.
 */
const tenantContext = (req, res, next) => {
  const user = req.user;
  if (!user) return next();

  if (user.role === ROLES.SUPER_ADMIN) {
    req.tenantFilter = {};
    req.tenantScope = 'GLOBAL';
    return next();
  }

  if (user.role === ROLES.CLUSTER_ADMIN) {
    if (!user.clusterId) {
      return next(new ApiError(403, 'Cluster Admin chưa được gán cụm trường', 403));
    }
    req.tenantFilter = { clusterId: user.clusterId };
    req.tenantScope = 'CLUSTER';
    req.clusterId = user.clusterId;
    return next();
  }

  if (!user.schoolId) {
    return next(new ApiError(403, 'Tài khoản chưa được gán trường học', 403));
  }

  req.tenantFilter = { schoolId: user.schoolId };
  req.tenantScope = 'SCHOOL';
  req.schoolId = user.schoolId;
  req.clusterId = user.clusterId;
  next();
};

module.exports = tenantContext;
