const { request: requestDto, response: responseDto } = require('../../dtos/admin/timetable.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const timetableService = require("../../config/container").services["timetable"];

const listTimetables = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await timetableService.listTimetables(req.user, requestDto.query(req))));
});

const upsertTimetable = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await timetableService.upsertTimetable(req.user, requestDto.body(req))), 'Lưu TKB thành công');
});

const approveTimetable = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await timetableService.approveTimetable(req.user, requestDto.params(req).id)), 'Duyệt TKB thành công');
});

module.exports = { listTimetables, upsertTimetable, approveTimetable };
