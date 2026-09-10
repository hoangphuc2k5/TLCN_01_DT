const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const service = require('../services/appointmentService');

const create = asyncHandler(async (req, res) => success(res, await service.createAppointment(req.user, req.body), 'Đặt lịch hẹn thành công', 201));
const list = asyncHandler(async (req, res) => success(res, await service.listAppointments(req.user, req.query)));
const review = asyncHandler(async (req, res) => success(res, await service.reviewAppointment(req.user, req.params.id, req.body), 'Cập nhật lịch hẹn thành công'));
const cancel = asyncHandler(async (req, res) => success(res, await service.cancelAppointment(req.user, req.params.id), 'Đã hủy lịch hẹn'));
const surveys = asyncHandler(async (req, res) => success(res, await service.listSurveys(req.user)));
const submitSurvey = asyncHandler(async (req, res) => success(res, await service.submitSurvey(req.user, req.params.id, req.body), 'Gửi khảo sát thành công', 201));

module.exports = { create, list, review, cancel, surveys, submitSurvey };
