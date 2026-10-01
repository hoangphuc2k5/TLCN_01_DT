const requestDto = require('../../dtos/administration/user.request.dto');
const responseDto = require('../../dtos/administration/user.response.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const userService = require("../../config/container").services["user"];

const listUsers = asyncHandler(async (req, res) => {
  const data = await userService.listUsers(req.user, requestDto.query(req));
  return success(res, responseDto.fromService(data));
});

const createUser = asyncHandler(async (req, res) => {
  const data = await userService.createUser(req.user, requestDto.body(req));
  return success(res, responseDto.fromService(data), 'Tạo người dùng thành công', 201);
});

const updateUser = asyncHandler(async (req, res) => {
  const data = await userService.updateUser(req.user, requestDto.params(req).id, requestDto.body(req));
  return success(res, responseDto.fromService(data), 'Cập nhật người dùng thành công');
});

const resetUserPassword = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const data = await userService.resetPassword(req.user, requestDto.params(req).id);
  return success(
    res, responseDto.fromService(data),
    'Đã tạo mật khẩu tạm mới; người dùng phải đổi khi đăng nhập.'
  );
});

const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.user, requestDto.params(req).id);
  return success(res, responseDto.fromService(true), 'Xóa người dùng thành công');
});

module.exports = { listUsers, createUser, updateUser, resetUserPassword, deleteUser };
