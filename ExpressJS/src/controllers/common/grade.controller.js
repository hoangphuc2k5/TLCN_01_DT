const requestDto = require('../../dtos/common/grade.request.dto');
const responseDto = require('../../dtos/common/grade.response.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const gradeService = require("../../config/container").services["grade"];

const listGrades = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await gradeService.listGrades(req.user, requestDto.query(req))));
});

const upsertGrade = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await gradeService.upsertGrade(req.user, requestDto.body(req))), 'Lưu điểm thành công');
});

const addScore = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await gradeService.addScore(req.user, requestDto.params(req).id, requestDto.body(req))), 'Thêm cột điểm thành công');
});

module.exports = { listGrades, upsertGrade, addScore };
