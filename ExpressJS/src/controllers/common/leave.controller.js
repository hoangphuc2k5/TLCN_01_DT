const requestDto = require('../../dtos/common/leave.request.dto');
const responseDto = require('../../dtos/common/leave.response.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const leaveService = require("../../config/container").services["leave"];

const listLeaves = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await leaveService.listLeaves(req.user, requestDto.query(req))));
});

const createLeave = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await leaveService.createLeave(req.user, requestDto.body(req))), 'Gửi đơn thành công', 201);
});

const reviewLeave = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await leaveService.reviewLeave(req.user, requestDto.params(req).id, requestDto.body(req))), 'Duyệt đơn thành công');
});

const cancelMakeup = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await leaveService.cancelMakeup(req.user, requestDto.params(req).id, requestDto.body(req))));
});

module.exports = { listLeaves, createLeave, reviewLeave, cancelMakeup };
