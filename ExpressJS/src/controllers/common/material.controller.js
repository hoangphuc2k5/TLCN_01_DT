const requestDto = require('../../dtos/common/material.request.dto');
const responseDto = require('../../dtos/common/material.response.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const resourceService = require("../../config/container").services["resource"];

const listMaterials = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await resourceService.listMaterials(req.user, requestDto.query(req))));
});

const createMaterial = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await resourceService.createMaterial(req.user, requestDto.body(req))), 'Thêm học liệu thành công', 201);
});

const deleteMaterial = asyncHandler(async (req, res) => {
  await resourceService.deleteMaterial(req.user, requestDto.params(req).id);
  return success(res, responseDto.fromService(true), 'Xóa học liệu thành công');
});

module.exports = { listMaterials, createMaterial, deleteMaterial };
