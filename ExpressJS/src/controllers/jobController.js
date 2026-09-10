const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const jobs = require('../services/jobService');
exports.list = asyncHandler(async (req, res) => success(res, await jobs.list(req.user, req.query)));
exports.retry = asyncHandler(async (req, res) => success(res, await jobs.change(req.user, req.params.id, 'retry', req.body), 'Đã lên lịch thử lại'));
exports.cancel = asyncHandler(async (req, res) => success(res, await jobs.change(req.user, req.params.id, 'cancel'), 'Đã hủy tác vụ'));
