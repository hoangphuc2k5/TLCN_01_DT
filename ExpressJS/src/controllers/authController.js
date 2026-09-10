const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const authService = require('../services/authService');
const { body } = require('express-validator');

const loginValidators = [
  body('email').isEmail().withMessage('Email không hợp lệ'),
  body('password').notEmpty().withMessage('Mật khẩu bắt buộc'),
];

const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body.email, req.body.password);
  return success(res, data, 'Đăng nhập thành công');
});

const loginGoogle = asyncHandler(async (req, res) => {
  const data = await authService.loginWithGoogle(req.body.credential || req.body.idToken);
  return success(res, data, 'Đăng nhập Gmail thành công');
});
const loginPhoneRequest = asyncHandler(async (req, res) => {
  const data = await require('../services/phoneAuthService').requestCode(req.body.phone);
  return success(res, data, 'OTP da duoc gui');
});
const loginPhoneVerify = asyncHandler(async (req, res) => {
  const data = await require('../services/phoneAuthService').verifyCode(req.body.challengeId, req.body.code);
  return success(res, data, 'Dang nhap bang so dien thoai thanh cong');
});
const loginSso = asyncHandler(async (req, res) => success(res, await authService.loginWithSso(req.body.assertion), 'Dang nhap SSO thanh cong'));

const authConfig = asyncHandler(async (req, res) => {
  return success(res, authService.getAuthConfig());
});

const me = asyncHandler(async (req, res) => {
  const data = await authService.getMe(req.user._id);
  return success(res, data);
});

const updateProfile = asyncHandler(async (req, res) => {
  const data = await authService.updateProfile(req.user._id, req.body);
  return success(res, data, 'Cập nhật hồ sơ thành công');
});

module.exports = { login, loginGoogle, loginPhoneRequest, loginPhoneVerify, loginSso, authConfig, me, updateProfile, loginValidators };
