const { request: requestDto, response: responseDto } = require('../../dtos/admin/admission.dto');
const asyncHandler = require("../../utils/common/http/async-handler.util");
const { success } = require("../../utils/common/http/response.util");
const service = require("../../config/container").services["admission"];

const createPublic = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.createPublic(requestDto.body(req))), 'Nộp hồ sơ tuyển sinh thành công', 201));
const getPublic = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.getPublic(requestDto.params(req).code))));
const list = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.list(req.user, requestDto.query(req)))));
const review = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.review(req.user, requestDto.params(req).id, requestDto.body(req))), 'Cập nhật hồ sơ thành công'));

module.exports = { createPublic, getPublic, list, review };
