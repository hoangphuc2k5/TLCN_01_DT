const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const service = require('../services/homeworkService');

const list = asyncHandler(async (req, res) => success(res, await service.listHomeworks(req.user, req.query)));
const get = asyncHandler(async (req, res) => success(res, await service.getHomework(req.user, req.params.id)));
const create = asyncHandler(async (req, res) => success(res, await service.createHomework(req.user, req.body), 'Tạo bài tập thành công', 201));
const update = asyncHandler(async (req, res) => success(res, await service.updateHomework(req.user, req.params.id, req.body), 'Cập nhật bài tập thành công'));
const publish = asyncHandler(async (req, res) => success(res, await service.publishHomework(req.user, req.params.id), 'Đã mở bài tập'));
const close = asyncHandler(async (req, res) => success(res, await service.closeHomework(req.user, req.params.id), 'Đã đóng bài tập'));
const submit = asyncHandler(async (req, res) => success(res, await service.submitHomework(req.user, req.params.id, req.body), 'Nộp bài thành công', 201));
const submissions = asyncHandler(async (req, res) => success(res, await service.listSubmissions(req.user, req.params.id)));
const grade = asyncHandler(async (req, res) => success(res, await service.gradeSubmission(req.user, req.params.submissionId, req.body), 'Chấm bài thành công'));

module.exports = { list, get, create, update, publish, close, submit, submissions, grade };
