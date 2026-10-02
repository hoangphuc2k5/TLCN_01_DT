const { request: requestDto, response: responseDto } = require('../../../dtos/common/scheduling/calendar.dto');
const asyncHandler = require("../../../utils/common/http/async-handler.util");
const { success } = require("../../../utils/common/http/response.util");
const crossService = require("../../../config/container").services["cross"];

const listEvents = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await crossService.listEvents(req.user, requestDto.query(req))));
});

const createEvent = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await crossService.createEvent(req.user, requestDto.body(req))), 'Tạo sự kiện thành công', 201);
});

const deleteEvent = asyncHandler(async (req, res) => {
  await crossService.deleteEvent(req.user, requestDto.params(req).id);
  return success(res, responseDto.fromService(true), 'Đã xóa sự kiện');
});

module.exports = { listEvents, createEvent, deleteEvent };
