const { request: requestDto, response: responseDto } = require('../../../dtos/common/files/import.dto');
const asyncHandler = require("../../../utils/common/http/async-handler.util");
const { success } = require("../../../utils/common/http/response.util");
const ApiError = require("../../../utils/common/http/api-error.util");
const importService = require("../../../config/container").services["import"];

const downloadTemplate = asyncHandler(async (req, res) => {
  const { buffer, filename } = importService.buildTemplateBuffer(requestDto.params(req).type);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  return res.send(buffer);
});

const requireFile = (req) => {
  if (!req.file?.buffer) throw new ApiError(400, 'Vui lòng chọn file Excel');
  return req.file.buffer;
};

const importUsers = asyncHandler(async (req, res) => {
  const data = await importService.importUsers(req.user, requireFile(req));
  return success(res, responseDto.fromService(data), `Import người dùng: ${data.success} thành công, ${data.failed} lỗi`);
});

const importGrades = asyncHandler(async (req, res) => {
  const data = await importService.importGrades(req.user, requireFile(req));
  return success(res, responseDto.fromService(data), `Import điểm: ${data.success} thành công, ${data.failed} lỗi`);
});

const importFees = asyncHandler(async (req, res) => {
  const data = await importService.importFees(req.user, requireFile(req));
  return success(res, responseDto.fromService(data), `Import học phí: ${data.success} thành công, ${data.failed} lỗi`);
});

const importAttendance = asyncHandler(async (req, res) => {
  const data = await importService.importAttendance(req.user, requireFile(req));
  return success(res, responseDto.fromService(data), `Import điểm danh: ${data.success} thành công, ${data.failed} lỗi`);
});

module.exports = {
  downloadTemplate,
  importUsers,
  importGrades,
  importFees,
  importAttendance,
};
