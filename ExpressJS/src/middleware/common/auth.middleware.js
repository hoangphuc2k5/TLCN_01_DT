require('dotenv').config();
const jwt = require('jsonwebtoken');
const ApiError = require("../../utils/common/api-error.util");
const systemRepository = require("../../config/container").repositories.system;
const { STATUS } = require("../../config/constants/status.config");
const roleCache = require("../../config/container").services["role-permission-cache"];

const PUBLIC_PATHS = [
  '/v1/api/auth/login',
  '/v1/api/auth/google',
  '/v1/api/auth/phone/request',
  '/v1/api/auth/phone/verify',
  '/v1/api/auth/sso',
  '/v1/api/auth/config',
  '/v1/api/auth/mfa/verify',
  '/v1/api/health',
  '/v1/api/online-payments/vnpay/ipn',
  '/v1/api/online-payments/vnpay/return',
];

const authenticate = async (req, res, next) => {
  try {
    const path = req.originalUrl.split('?')[0].replace(/\/$/, '').toLowerCase();
    if (PUBLIC_PATHS.includes(path) || path.startsWith('/v1/api/online-payments/webhook/') || path === '/v1/api/admissions/public' || path.startsWith('/v1/api/admissions/public/') || req.method === 'OPTIONS') {
      return next();
    }

    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new ApiError(401, 'Bạn chưa truyền Access Token', 401);
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (decoded.purpose && decoded.purpose !== 'access') throw new ApiError(401, 'Token không hợp lệ.');
    const user = await systemRepository.findAuthUser(decoded._id);
    if (!user || user.status !== STATUS.ACTIVE) {
      throw new ApiError(401, 'Tài khoản không hợp lệ hoặc đã bị khóa', 401);
    }

    if ((decoded.sessionVersion || 0) !== (user.security?.sessionVersion || 0)) throw new ApiError(401, 'Phiên đã bị thu hồi. Hãy đăng nhập lại.');
    if (user.security?.mustChangePassword && !['/v1/api/auth/me', '/v1/api/auth/security', '/v1/api/auth/password'].includes(path)) {
      throw new ApiError(403, 'Bạn phải đổi mật khẩu tạm trước khi tiếp tục.');
    }

    const role = await roleCache.getRole(user.role);
    if (!role || !(require("../../config/container").services["role"].visibleRole(user, role))) {
      throw new ApiError(403, 'Vai trò không tồn tại hoặc đã bị vô hiệu hóa', 403);
    }
    // Keep security material out of downstream controllers and serializers.
    user.set('security', undefined);
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Token hết hạn hoặc không hợp lệ', 401));
    }
    next(error);
  }
};

module.exports = authenticate;
