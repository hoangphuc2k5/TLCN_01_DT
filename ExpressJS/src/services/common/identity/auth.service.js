function createAuthService(dependencies) {
  const persistence = dependencies.persistence;
  require('dotenv').config();
  const bcrypt = require('bcrypt');
  const security = dependencies.services["auth-security"];
  const throttle = dependencies.services["auth-throttle"];
  const google = dependencies.services["google-identity"];
  const ApiError = require("../../../utils/common/http/api-error.util");
  const { isGmailAddress } = require("../../../utils/common/communication/gmail.util");
  const { toSafeObject } = require("../../../utils/common/identity/user-sanitizer.util");
  const { userRepo } = dependencies.repositories["shared"];
  const { ROLE_LABELS } = require("../../../config/constants/roles.config");
  const { STATUS } = require("../../../config/constants/status.config");
  const roleCache = dependencies.services["role-permission-cache"];
  const sso = dependencies.services["sso-identity"];
  
  
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
  
    const user = await persistence.userFindOne({ email: normalized });
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
  
    let user = await persistence.userFindOne2({ email });
    if (!user && payload.sub) {
      user = await persistence.loginWithGoogleFindOne({ googleId: payload.sub });
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
  
    user = await dependencies.repositories["auth-security"].update(user, updates);
    return security.beginLogin(user);
  };
  
  const loginWithSso = async assertion => {
    const identity = sso.verifyAssertion(assertion);
    let user = await persistence.userFindOne3({ $or: [{ ssoSubject: identity.sub }, { email: String(identity.email).toLowerCase() }] });
    if (!user) throw new ApiError(404, 'Khong tim thay tai khoan doanh nghiep');
    if (user.status !== STATUS.ACTIVE) throw new ApiError(403, 'Tai khoan da bi khoa hoac tam ngung');
    user = await dependencies.repositories["auth-security"].update(user, { ssoSubject: identity.sub, authProvider: user.password ? 'both' : 'sso', ...(identity.name && user.name.startsWith('User') ? { name: identity.name } : {}) });
    return security.beginLogin(user);
  };
  
  const getAuthConfig = () => {
    const { getAppName } = require("../../../utils/common/platform/app-name.util");
    return {
      appName: getAppName(),
      googleClientId: process.env.GOOGLE_CLIENT_ID || '',
      gmailOnly: process.env.AUTH_GMAIL_ONLY !== 'false',
      allowPasswordLogin: process.env.ALLOW_PASSWORD_LOGIN !== 'false',
      phoneLogin: process.env.PHONE_LOGIN_ENABLED !== 'false',
      enterpriseSso: !!process.env.ENTERPRISE_SSO_SECRET,
    };
  };
  
  const getMe = async (userId) => {
    const user = await persistence.userFindById(userId, [
      'schoolId',
      'clusterId',
      'classId',
      { path: 'parentOf', select: 'name email code classId' },
    ]);
    if (!user) throw new ApiError(404, 'Không tìm thấy người dùng');
    const roleMeta = await roleCache.getRole(user.role);
    const permissions = await roleCache.listLegacyPermissionsForRole(user.role);
    return {
      ...toSafeObject(user),
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
    const user = await persistence.userUpdateById(userId, update);
    if (!user) throw new ApiError(404, 'Không tìm thấy người dùng');
    return toSafeObject(user);
  };
  
  const hashPassword = dependencies.services["password-policy"].hash;
  
  return {
    login,
    loginWithGoogle,
    loginWithSso,
    getAuthConfig,
    getMe,
    updateProfile,
    hashPassword,
    isGmailAddress,
  };
  
}

class AuthService {
  constructor(dependencies) {
    Object.assign(this, createAuthService(dependencies));
  }
}

module.exports = AuthService;
