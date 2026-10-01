const { request: requestDto, response: responseDto } = require('../../dtos/common/auth.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const authService = require("../../config/container").services["auth"];
const { body } = require('express-validator');

const loginValidators = [
  body('email').isEmail().withMessage('Email không hợp lệ'),
  body('password').notEmpty().withMessage('Mật khẩu bắt buộc'),
];

const login = asyncHandler(async (req, res) => {
  const data = await authService.login(requestDto.body(req).email, requestDto.body(req).password);
  return success(res, responseDto.fromService(data), 'Đăng nhập thành công');
});

const loginGoogle = asyncHandler(async (req, res) => {
  const data = await authService.loginWithGoogle(requestDto.body(req).credential || requestDto.body(req).idToken);
  return success(res, responseDto.fromService(data), 'Đăng nhập Gmail thành công');
});
const loginPhoneRequest = asyncHandler(async (req, res) => {
  const data = await require("../../config/container").services["phone-auth"].requestCode(requestDto.body(req).phone);
  return success(res, responseDto.fromService(data), 'OTP da duoc gui');
});
const loginPhoneVerify = asyncHandler(async (req, res) => {
  const data = await require("../../config/container").services["phone-auth"].verifyCode(requestDto.body(req).challengeId, requestDto.body(req).code);
  return success(res, responseDto.fromService(data), 'Dang nhap bang so dien thoai thanh cong');
});
const loginSso = asyncHandler(async (req, res) => success(res, responseDto.fromService(await authService.loginWithSso(requestDto.body(req).assertion)), 'Dang nhap SSO thanh cong'));

const authConfig = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(authService.getAuthConfig()));
});

const me = asyncHandler(async (req, res) => {
  const data = await authService.getMe(req.user._id);
  return success(res, responseDto.fromService(data));
});

const updateProfile = asyncHandler(async (req, res) => {
  const data = await authService.updateProfile(req.user._id, requestDto.body(req));
  return success(res, responseDto.fromService(data), 'Cập nhật hồ sơ thành công');
});

module.exports = { login, loginGoogle, loginPhoneRequest, loginPhoneVerify, loginSso, authConfig, me, updateProfile, loginValidators };
