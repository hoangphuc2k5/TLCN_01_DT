const { request: requestDto, response: responseDto } = require('../../dtos/common/facility.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const resourceService = require("../../config/container").services["resource"];

const listFacilities = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await resourceService.listFacilities(req.user, requestDto.query(req))));
});

const createFacility = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await resourceService.createFacility(req.user, requestDto.body(req))), 'Gửi yêu cầu thành công', 201);
});

const reviewFacility = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await resourceService.reviewFacility(req.user, requestDto.params(req).id, requestDto.body(req))), 'Cập nhật yêu cầu thành công');
});

module.exports = { listFacilities, createFacility, reviewFacility };
