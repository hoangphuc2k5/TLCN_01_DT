const requestDto = require('../../dtos/administration/job.request.dto');
const responseDto = require('../../dtos/administration/job.response.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const jobs = require("../../config/container").services["job"];
exports.list = asyncHandler(async (req, res) => success(res, responseDto.fromService(await jobs.list(req.user, requestDto.query(req)))));
exports.retry = asyncHandler(async (req, res) => success(res, responseDto.fromService(await jobs.change(req.user, requestDto.params(req).id, 'retry', requestDto.body(req))), 'Đã lên lịch thử lại'));
exports.cancel = asyncHandler(async (req, res) => success(res, responseDto.fromService(await jobs.change(req.user, requestDto.params(req).id, 'cancel')), 'Đã hủy tác vụ'));
