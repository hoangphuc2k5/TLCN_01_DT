const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const roleService = require('../services/roleService');

const listRoles = asyncHandler(async (req, res) => {
  return success(res, await roleService.listRoles(req.user, req.query));
});

const listAssignable = asyncHandler(async (req, res) => {
  return success(res, await roleService.listAssignableRoles(req.user));
});

const permissionCatalog = asyncHandler(async (req, res) => {
  return success(res, roleService.getPermissionCatalog());
});

const createRole = asyncHandler(async (req, res) => {
  return success(res, await roleService.createRole(req.user, req.body), 'Tạo vai trò thành công', 201);
});

const updateRole = asyncHandler(async (req, res) => {
  return success(res, await roleService.updateRole(req.user, req.params.id, req.body), 'Cập nhật vai trò thành công');
});

const deleteRole = asyncHandler(async (req, res) => {
  await roleService.deleteRole(req.user, req.params.id);
  return success(res, true, 'Đã xóa vai trò');
});

module.exports = {
  listRoles,
  listAssignable,
  permissionCatalog,
  createRole,
  updateRole,
  deleteRole,
};
