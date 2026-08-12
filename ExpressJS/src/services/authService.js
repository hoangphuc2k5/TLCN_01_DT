require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const ApiError = require('../utils/ApiError');
const { assertGmailOnly, isGmailAddress } = require('../utils/gmail');
const { userRepo } = require('../repositories');
const { listLegacyPermissionsForRole } = require('../constants/permissions');
const { ROLE_LABELS } = require('../constants/roles');
const { STATUS } = require('../constants/status');
const roleCache = require('./rolePermissionCache');

const SALT_ROUNDS = 10;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const buildAuthPayload = async (user) => {
  const roleMeta = await roleCache.getRole(user.role);
  const permissions = await listLegacyPermissionsForRole(user.role);
  return {
    access_token: jwt.sign(
      {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        schoolId: user.schoolId,
        clusterId: user.clusterId,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '1d' }
    ),
    user: {
      ...user.toSafeObject(),
      roleLabel: roleMeta?.name || ROLE_LABELS[user.role] || user.role,
      roleLevel: roleMeta?.level ?? (await roleCache.getRoleLevel(user.role)),
      permissions,
      permissionEntries: roleMeta?.permissions || [],
    },
  };
};

const login = async (email, password) => {
  if (process.env.ALLOW_PASSWORD_LOGIN === 'false') {
    throw new ApiError(403, 'Hệ thống chỉ hỗ trợ đăng nhập bằng Gmail (Google).', 403);
  }

  const normalized = email.toLowerCase().trim();
  if (process.env.AUTH_GMAIL_ONLY !== 'false' && !isGmailAddress(normalized)) {
    // Dev seed dùng email trường — vẫn cho phép khi ALLOW_PASSWORD_LOGIN
  }

  const user = await userRepo.findOne({ email: normalized });
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

  return buildAuthPayload(user);
};

/**
 * Đăng nhập bằng Google ID token — chỉ chấp nhận Gmail
 * User phải được admin tạo trước với đúng email Gmail.
 */
const loginWithGoogle = async (idToken) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new ApiError(
      500,
      'Chưa cấu hình GOOGLE_CLIENT_ID. Vui lòng thêm Client ID từ Google Cloud Console.',
      500
    );
  }
  if (!idToken) {
    throw new ApiError(400, 'Thiếu Google credential');
  }

  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch {
    throw new ApiError(401, 'Google token không hợp lệ hoặc đã hết hạn', 401);
  }

  const payload = ticket.getPayload();
  const email = (payload.email || '').toLowerCase().trim();
  const emailVerified = payload.email_verified;

  if (!emailVerified) {
    throw new ApiError(403, 'Email Gmail chưa được xác minh', 403);
  }

  try {
    assertGmailOnly(email);
  } catch (e) {
    throw new ApiError(e.statusCode || 403, e.message, e.errorCode || 403);
  }

  let user = await userRepo.findOne({ email });
  if (!user && payload.sub) {
    user = await userRepo.findOne({ googleId: payload.sub });
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

  user = await userRepo.updateById(user._id, updates);
  return buildAuthPayload(user);
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
  ]);
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng');
  const roleMeta = await roleCache.getRole(user.role);
  const permissions = await listLegacyPermissionsForRole(user.role);
  return {
    ...user.toSafeObject(),
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

const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);

module.exports = {
  login,
  loginWithGoogle,
  getAuthConfig,
  getMe,
  updateProfile,
  hashPassword,
  isGmailAddress,
};
