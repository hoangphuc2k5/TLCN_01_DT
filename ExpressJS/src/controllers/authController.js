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

module.exports = { login, loginGoogle, authConfig, me, updateProfile, loginValidators };
