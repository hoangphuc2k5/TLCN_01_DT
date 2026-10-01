const requestDto = require('../../dtos/common/export.request.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const crossService = require("../../config/container").services["cross"];

const exportGrades = asyncHandler(async (req, res) => {
  const buffer = await crossService.exportGradesExcel(req.user, requestDto.query(req));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=bang-diem.xlsx');
  return res.send(buffer);
});

const exportFees = asyncHandler(async (req, res) => {
  const buffer = await crossService.exportFeesExcel(req.user, requestDto.query(req));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=hoc-phi.xlsx');
  return res.send(buffer);
});

const exportAttendance = asyncHandler(async (req, res) => {
  const buffer = await crossService.exportAttendanceExcel(req.user, requestDto.query(req));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=diem-danh.xlsx');
  return res.send(buffer);
});

module.exports = { exportGrades, exportFees, exportAttendance };
