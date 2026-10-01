const requestDto = require('../../dtos/common/attendance.request.dto');
const responseDto = require('../../dtos/common/attendance.response.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const attendanceService = require("../../config/container").services["attendance"];

const listAttendance = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await attendanceService.listAttendance(req.user, requestDto.query(req))));
});

const recordAttendance = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await attendanceService.recordAttendance(req.user, requestDto.body(req))), 'Lưu điểm danh thành công');
});

module.exports = { listAttendance, recordAttendance };
