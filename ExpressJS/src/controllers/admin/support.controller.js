const { request: requestDto, response: responseDto } = require('../../dtos/admin/support.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const adminExtraService = require("../../config/container").services["admin-extra"];

const listTickets = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await adminExtraService.listTickets(req.user, requestDto.query(req))));
});

const createTicket = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await adminExtraService.createTicket(req.user, requestDto.body(req))), 'Tạo ticket thành công', 201);
});

const updateTicket = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await adminExtraService.updateTicket(req.user, requestDto.params(req).id, requestDto.body(req))), 'Cập nhật ticket thành công');
});

module.exports = { listTickets, createTicket, updateTicket };
