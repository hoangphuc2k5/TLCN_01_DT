require('dotenv').config();
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const { STATUS } = require('../constants/status');
const roleCache = require('../services/rolePermissionCache');

const PUBLIC_PATHS = [
  '/v1/api/auth/login',
  '/v1/api/auth/google',
  '/v1/api/auth/config',
  '/v1/api/health',
];

const authenticate = async (req, res, next) => {
  try {
    if (PUBLIC_PATHS.some((p) => req.originalUrl.startsWith(p)) || req.method === 'OPTIONS') {
      return next();
    }

    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new ApiError(401, 'Bạn chưa truyền Access Token', 401);
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id).select('-password');
    if (!user || user.status !== STATUS.ACTIVE) {
      throw new ApiError(401, 'Tài khoản không hợp lệ hoặc đã bị khóa', 401);
    }

    if (!(await roleCache.getRole(user.role))) {
      throw new ApiError(403, 'Vai trò không tồn tại hoặc đã bị vô hiệu hóa', 403);
    }
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
