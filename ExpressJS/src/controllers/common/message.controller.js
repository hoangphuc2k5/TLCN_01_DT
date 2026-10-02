const { request: requestDto, response: responseDto } = require('../../dtos/common/message.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const crossService = require("../../config/container").services["cross"];

const listMessages = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await crossService.listMessages(req.user, requestDto.query(req))));
});

const sendMessage = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await crossService.sendMessage(req.user, requestDto.body(req))), 'Đã gửi tin nhắn', 201);
});

const markMessageRead = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await crossService.markMessageRead(req.user, requestDto.params(req).id)));
});

const realtimeTicket = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  return success(res, responseDto.fromService(await require("../../config/container").services["message-realtime"].issueTicket(req.user)));
});

module.exports = { listMessages, sendMessage, markMessageRead, realtimeTicket };
