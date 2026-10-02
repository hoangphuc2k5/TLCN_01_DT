const { request: requestDto, response: responseDto } = require('../../dtos/teacher/lesson-plan.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const service = require("../../config/container").services["lesson-plan"];

const list = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.list(req.user, requestDto.query(req)))));
const get = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.get(req.user, requestDto.params(req).id))));
const create = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.create(req.user, requestDto.body(req))), 'Tạo giáo án thành công', 201));
const update = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.update(req.user, requestDto.params(req).id, requestDto.body(req))), 'Cập nhật giáo án thành công'));
const submit = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.submit(req.user, requestDto.params(req).id)), 'Đã gửi giáo án chờ duyệt'));
const review = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.review(req.user, requestDto.params(req).id, requestDto.body(req))), 'Đã xử lý giáo án'));
const remove = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.remove(req.user, requestDto.params(req).id)), 'Đã xóa giáo án'));

module.exports = { list, get, create, update, submit, review, remove };
