const requestDto = require('../../dtos/common/exam.request.dto');
const responseDto = require('../../dtos/common/exam.response.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const examService = require("../../config/container").services["exam"];

const listExams = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await examService.listExams(req.user, requestDto.query(req))));
});

const getExam = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await examService.getExam(req.user, requestDto.params(req).id)));
});

const createExam = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await examService.createExam(req.user, requestDto.body(req))), 'Tạo đề thi thành công', 201);
});

const updateExam = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await examService.updateExam(req.user, requestDto.params(req).id, requestDto.body(req))), 'Cập nhật đề thi thành công');
});

const startAttempt = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await examService.startAttempt(req.user, requestDto.params(req).id)), 'Bắt đầu làm bài', 201);
});

const submitAttempt = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await examService.submitAttempt(req.user, requestDto.params(req).attemptId, requestDto.body(req).answers)), 'Nộp bài thành công');
});

const saveAttemptDraft = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await examService.saveDraft(req.user, requestDto.params(req).attemptId, requestDto.body(req).answers)), 'Đã lưu bản nháp');
});

const gradeAttempt = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await examService.gradeEssay(req.user, requestDto.params(req).attemptId, requestDto.body(req).grades)), 'Chấm bài thành công');
});

const listAttempts = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await examService.listAttempts(req.user, requestDto.query(req))));
});

module.exports = { listExams, getExam, createExam, updateExam, startAttempt, submitAttempt, saveAttemptDraft, gradeAttempt, listAttempts };
