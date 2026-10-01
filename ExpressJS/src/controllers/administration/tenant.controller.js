const requestDto = require('../../dtos/administration/tenant.request.dto');
const responseDto = require('../../dtos/administration/tenant.response.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const tenantService = require("../../config/container").services["tenant"];

const listClusters = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await tenantService.listClusters(req.user, requestDto.query(req))));
});

const createCluster = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await tenantService.createCluster(requestDto.body(req))), 'Tạo cụm thành công', 201);
});

const updateCluster = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await tenantService.updateCluster(requestDto.params(req).id, requestDto.body(req))), 'Cập nhật cụm thành công');
});

const deleteCluster = asyncHandler(async (req, res) => {
  await tenantService.deleteCluster(requestDto.params(req).id);
  return success(res, responseDto.fromService(true), 'Xóa cụm thành công');
});

const listSchools = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await tenantService.listSchools(req.user, requestDto.query(req))));
});

const createSchool = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await tenantService.createSchool(req.user, requestDto.body(req))), 'Tạo trường thành công', 201);
});

const updateSchool = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await tenantService.updateSchool(req.user, requestDto.params(req).id, requestDto.body(req))), 'Cập nhật trường thành công');
});

const deleteSchool = asyncHandler(async (req, res) => {
  await tenantService.deleteSchool(requestDto.params(req).id);
  return success(res, responseDto.fromService(true), 'Xóa trường thành công');
});

module.exports = { listClusters, createCluster, updateCluster, deleteCluster, listSchools, createSchool, updateSchool, deleteSchool };
