const validate = require("../../../middleware/common/http/validate.middleware");
const audit = require("../../../middleware/common/security/audit.middleware");
const authController = require("../../../controllers/common/identity/auth.controller");
const authSecurity = require("../../../controllers/common/identity/auth-security.controller");

const register1 = router => {
  router.use('/auth', authSecurity.noStore);
  router.post(['/auth/login', '/auth/google', '/auth/phone/request', '/auth/phone/verify', '/auth/sso', '/auth/mfa/verify', '/auth/mfa/setup', '/auth/mfa/confirm', '/auth/mfa/disable', '/auth/mfa/recovery', '/auth/password'], authSecurity.limit);
  router.post('/auth/login', authController.loginValidators, validate, authController.login);
  router.post('/auth/google', authController.loginGoogle);
  router.post('/auth/phone/request', authController.loginPhoneRequest);
  router.post('/auth/phone/verify', authController.loginPhoneVerify);
  router.post('/auth/sso', authController.loginSso);
  router.get('/auth/config', authController.authConfig);
  router.get('/auth/me', authController.me);
  router.put('/auth/profile', authController.updateProfile);
  router.get('/auth/security', authSecurity.status);
  router.post('/auth/mfa/verify', authSecurity.verify);
  router.post('/auth/mfa/setup', audit('MFA_SETUP', 'User'), authSecurity.setup);
  router.post('/auth/mfa/confirm', audit('MFA_ENABLE', 'User'), authSecurity.confirm);
  router.post('/auth/mfa/disable', audit('MFA_DISABLE', 'User'), authSecurity.disable);
  router.post('/auth/mfa/recovery', audit('MFA_RECOVERY_ROTATE', 'User'), authSecurity.recovery);
  router.post('/auth/password', audit('CHANGE_PASSWORD', 'User'), authSecurity.password);
};

module.exports = { register1 };
