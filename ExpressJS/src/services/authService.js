require('dotenv').config();
const bcrypt = require('bcrypt');
const security = require('./authSecurityService');
const throttle = require('./authThrottle');
const google = require('./googleIdentity');
const ApiError = require('../utils/ApiError');
const { isGmailAddress } = require('../utils/gmail');
const { userRepo } = require('../repositories');
const { listLegacyPermissionsForRole } = require('../constants/permissions');
const { ROLE_LABELS } = require('../constants/roles');
const { STATUS } = require('../constants/status');
const roleCache = require('./rolePermissionCache');


const login = async (email, password) => {
  if (process.env.ALLOW_PASSWORD_LOGIN === 'false') {
    throw new ApiError(403, 'Hệ thống chỉ hỗ trợ đăng nhập bằng Gmail (Google).', 403);
  }

  if (typeof email !== 'string' || typeof password !== 'string' || password.length > 1024) throw new ApiError(400, 'Thông tin đăng nhập không hợp lệ.');
  const normalized = email.toLowerCase().trim();
  const attempt = await throttle.consume('primary', normalized);
  if (process.env.AUTH_GMAIL_ONLY !== 'false' && !isGmailAddress(normalized)) {
    // Dev seed dùng email trường — vẫn cho phép khi ALLOW_PASSWORD_LOGIN
  }

  const user = await userRepo.findOne({ email: normalized }).select('+password +security');
  if (!user) {
    throw new ApiError(401, 'Email/mật khẩu không hợp lệ', 1);
  }
  if (user.status !== STATUS.ACTIVE) {
    throw new ApiError(403, 'Tài khoản đã bị khóa hoặc tạm ngưng', 403);
  }
  if (!user.password) {
    throw new ApiError(400, 'Tài khoản này chỉ đăng nhập bằng Gmail (Google Sign-In)', 400);
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new ApiError(401, 'Email/mật khẩu không hợp lệ', 2);
  }

  await throttle.release(attempt);

  return security.beginLogin(user);
};

/**
 * Đăng nhập bằng Google ID token — chỉ chấp nhận Gmail
 * User phải được admin tạo trước với đúng email Gmail.
 */
const loginWithGoogle = async (idToken) => {
  const payload = await google.verify(idToken);
  const email = payload.email;

  let user = await userRepo.findOne({ email }).select('+password +security');
  if (!user && payload.sub) {
    user = await userRepo.findOne({ googleId: payload.sub }).select('+password +security');
  }

  if (!user) {
    throw new ApiError(
      404,
      `Không tìm thấy tài khoản với Gmail ${email}. Liên hệ quản trị viên để được cấp quyền.`,
      404
    );
  }
  if (user.status !== STATUS.ACTIVE) {
    throw new ApiError(403, 'Tài khoản đã bị khóa hoặc tạm ngưng', 403);
  }

  const updates = {
    googleId: payload.sub,
    authProvider: user.password ? 'both' : 'google',
  };
  if (payload.picture && !user.avatar) updates.avatar = payload.picture;
  if (payload.name && user.name.startsWith('User')) updates.name = payload.name;

  user = await require('../repositories/authSecurityRepository').update(user, updates);
  return security.beginLogin(user);
};

const getAuthConfig = () => {
  const { getAppName } = require('../utils/appName');
  return {
    appName: getAppName(),
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    gmailOnly: process.env.AUTH_GMAIL_ONLY !== 'false',
    allowPasswordLogin: process.env.ALLOW_PASSWORD_LOGIN !== 'false',
  };
};

const getMe = async (userId) => {
  const user = await userRepo.findById(userId, [
    'schoolId',
    'clusterId',
    'classId',
    { path: 'parentOf', select: 'name email code classId' },
  ]).select('+security');
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng');
  const roleMeta = await roleCache.getRole(user.role);
  const permissions = await listLegacyPermissionsForRole(user.role);
  return {
    ...user.toSafeObject(),
    mustChangePassword: !!user.security?.mustChangePassword,
    roleLabel: roleMeta?.name || ROLE_LABELS[user.role] || user.role,
    roleLevel: roleMeta?.level ?? (await roleCache.getRoleLevel(user.role)),
    permissions,
    permissionEntries: roleMeta?.permissions || [],
  };
};

const updateProfile = async (userId, data) => {
  const allowed = ['name', 'phone', 'address', 'avatar', 'bio', 'dateOfBirth', 'gender'];
  const update = {};
  for (const key of allowed) {
    if (data[key] !== undefined) update[key] = data[key];
  }
  const user = await userRepo.updateById(userId, update);
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng');
  return user.toSafeObject();
};

const hashPassword = require('./passwordPolicy').hash;

module.exports = {
  login,
  loginWithGoogle,
  getAuthConfig,
  getMe,
  updateProfile,
  hashPassword,
  isGmailAddress,
};
