const asyncHandler = require('../utils/asyncHandler'); const { success } = require('../utils/response'); const comparison = require('../services/schoolComparisonService');
exports.compareSchools = asyncHandler(async (req, res) => success(res, await comparison.compare(req.user, req.query)));
exports.exportSchoolsExcel = asyncHandler(async (req, res) => {
  const buffer = await comparison.exportExcel(req.user, req.query);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=doi-chieu-lien-truong.xlsx');
  return res.send(buffer);
});
exports.exportSchoolsPdf = asyncHandler(async (req, res) => {
  const buffer = await comparison.exportPdf(req.user, req.query);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=doi-chieu-lien-truong.pdf');
  return res.send(buffer);
});
