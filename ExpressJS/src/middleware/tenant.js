const { ROLES } = require('../constants/roles');
const ApiError = require('../utils/ApiError');
const School = require('../models/School');

/**
 * Tenant isolation middleware
 * Injects req.tenantFilter based on role scope.
 */
const tenantContext = async (req, res, next) => {
 try {
  const user = req.user;
  if (!user) return next();

  const baseDomain = String(process.env.TENANT_BASE_DOMAIN || '').toLowerCase().replace(/^\.+|\.+$/g, '');
  if (baseDomain && req.hostname.toLowerCase().endsWith(`.${baseDomain}`)) {
    const subdomain = req.hostname.toLowerCase().slice(0, -baseDomain.length - 1).split('.')[0];
    if (subdomain && !['www', 'api'].includes(subdomain)) {
      const school = await School.findOne({ subdomain }).select('_id clusterId status');
      if (!school || school.status !== 'ACTIVE') throw new ApiError(404, 'Subdomain truong khong ton tai');
      if (user.role === ROLES.CLUSTER_ADMIN && String(school.clusterId) !== String(user.clusterId)) throw new ApiError(403, 'Subdomain ngoai pham vi cum');
      if (user.role !== ROLES.SUPER_ADMIN && user.role !== ROLES.CLUSTER_ADMIN && String(school._id) !== String(user.schoolId)) throw new ApiError(403, 'Subdomain ngoai pham vi truong');
      req.schoolSubdomain = school.subdomain; req.tenantSchoolId = school._id;
    }
  }

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
 } catch (error) { next(error); }
};

module.exports = tenantContext;
