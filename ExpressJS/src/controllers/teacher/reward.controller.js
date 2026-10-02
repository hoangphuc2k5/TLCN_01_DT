const { request: requestDto, response: responseDto } = require('../../dtos/teacher/reward.dto');
const asyncHandler = require("../../utils/common/http/async-handler.util");
const { success } = require("../../utils/common/http/response.util");
const service = require("../../config/container").services["reward"];

const list = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.list(req.user, requestDto.query(req)))));
const create = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.create(req.user, requestDto.body(req))), 'Tạo bản ghi thành công', 201));
const review = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.review(req.user, requestDto.params(req).id, requestDto.body(req))), 'Duyệt bản ghi thành công'));

module.exports = { list, create, review };
