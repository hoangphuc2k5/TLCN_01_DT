const { request: requestDto, response: responseDto } = require('../../dtos/common/platform.dto');
const asyncHandler = require("../../utils/common/async-handler.util"); const { success } = require("../../utils/common/response.util"); const comparison = require("../../config/container").services["school-comparison"];
exports.compareSchools = asyncHandler(async (req, res) => success(res, responseDto.fromService(await comparison.compare(req.user, requestDto.query(req)))));
exports.exportSchoolsExcel = asyncHandler(async (req, res) => {
  const buffer = await comparison.exportExcel(req.user, requestDto.query(req));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=doi-chieu-lien-truong.xlsx');
  return res.send(buffer);
});
exports.exportSchoolsPdf = asyncHandler(async (req, res) => {
  const buffer = await comparison.exportPdf(req.user, requestDto.query(req));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=doi-chieu-lien-truong.pdf');
  return res.send(buffer);
});
