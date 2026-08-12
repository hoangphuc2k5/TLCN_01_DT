const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const crossService = require('../services/crossService');

const listMessages = asyncHandler(async (req, res) => {
  return success(res, await crossService.listMessages(req.user, req.query));
});
const sendMessage = asyncHandler(async (req, res) => {
  return success(res, await crossService.sendMessage(req.user, req.body), 'Đã gửi tin nhắn', 201);
});
const markMessageRead = asyncHandler(async (req, res) => {
  return success(res, await crossService.markMessageRead(req.user, req.params.id));
});

const listEvents = asyncHandler(async (req, res) => {
  return success(res, await crossService.listEvents(req.user, req.query));
});
const createEvent = asyncHandler(async (req, res) => {
  return success(res, await crossService.createEvent(req.user, req.body), 'Tạo sự kiện thành công', 201);
});
const deleteEvent = asyncHandler(async (req, res) => {
  await crossService.deleteEvent(req.user, req.params.id);
  return success(res, true, 'Đã xóa sự kiện');
});

const search = asyncHandler(async (req, res) => {
  return success(res, await crossService.globalSearch(req.user, req.query.q || ''));
});

const exportGrades = asyncHandler(async (req, res) => {
  const buffer = await crossService.exportGradesExcel(req.user, req.query);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=bang-diem.xlsx');
  return res.send(buffer);
});

const exportFees = asyncHandler(async (req, res) => {
  const buffer = await crossService.exportFeesExcel(req.user);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=hoc-phi.xlsx');
  return res.send(buffer);
});

const exportAttendance = asyncHandler(async (req, res) => {
  const buffer = await crossService.exportAttendanceExcel(req.user, req.query);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=diem-danh.xlsx');
  return res.send(buffer);
});

module.exports = {
  listMessages,
  sendMessage,
  markMessageRead,
  listEvents,
  createEvent,
  deleteEvent,
  search,
  exportGrades,
  exportFees,
  exportAttendance,
};
