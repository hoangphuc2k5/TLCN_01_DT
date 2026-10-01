const requestDto = require('../../dtos/common/homework.request.dto');
const responseDto = require('../../dtos/common/homework.response.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const service = require("../../config/container").services["homework"];

const list = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.listHomeworks(req.user, requestDto.query(req)))));
const get = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.getHomework(req.user, requestDto.params(req).id))));
const create = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.createHomework(req.user, requestDto.body(req))), 'Tạo bài tập thành công', 201));
const update = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.updateHomework(req.user, requestDto.params(req).id, requestDto.body(req))), 'Cập nhật bài tập thành công'));
const publish = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.publishHomework(req.user, requestDto.params(req).id)), 'Đã mở bài tập'));
const close = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.closeHomework(req.user, requestDto.params(req).id)), 'Đã đóng bài tập'));
const submit = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.submitHomework(req.user, requestDto.params(req).id, requestDto.body(req))), 'Nộp bài thành công', 201));
const submissions = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.listSubmissions(req.user, requestDto.params(req).id))));
const grade = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.gradeSubmission(req.user, requestDto.params(req).submissionId, requestDto.body(req))), 'Chấm bài thành công'));

module.exports = { list, get, create, update, publish, close, submit, submissions, grade };
