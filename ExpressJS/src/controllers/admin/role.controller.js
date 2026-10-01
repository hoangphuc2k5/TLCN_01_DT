const { request: requestDto, response: responseDto } = require('../../dtos/admin/role.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const roleService = require("../../config/container").services["role"];

const listRoles = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await roleService.listRoles(req.user, requestDto.query(req))));
});

const listAssignable = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await roleService.listAssignableRoles(req.user)));
});

const permissionCatalog = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(roleService.getPermissionCatalog()));
});

const createRole = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await roleService.createRole(req.user, requestDto.body(req))), 'Tạo vai trò thành công', 201);
});

const updateRole = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await roleService.updateRole(req.user, requestDto.params(req).id, requestDto.body(req))), 'Cập nhật vai trò thành công');
});

const deleteRole = asyncHandler(async (req, res) => {
  await roleService.deleteRole(req.user, requestDto.params(req).id);
  return success(res, responseDto.fromService(true), 'Đã xóa vai trò');
});

module.exports = {
  listRoles,
  listAssignable,
  permissionCatalog,
  createRole,
  updateRole,
  deleteRole,
};
