const requestDto = require('../../dtos/common/appointment.request.dto');
const responseDto = require('../../dtos/common/appointment.response.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const service = require("../../config/container").services["appointment"];

const create = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.createAppointment(req.user, requestDto.body(req))), 'Đặt lịch hẹn thành công', 201));
const list = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.listAppointments(req.user, requestDto.query(req)))));
const review = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.reviewAppointment(req.user, requestDto.params(req).id, requestDto.body(req))), 'Cập nhật lịch hẹn thành công'));
const cancel = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.cancelAppointment(req.user, requestDto.params(req).id)), 'Đã hủy lịch hẹn'));
const surveys = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.listSurveys(req.user))));
const submitSurvey = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.submitSurvey(req.user, requestDto.params(req).id, requestDto.body(req))), 'Gửi khảo sát thành công', 201));

module.exports = { create, list, review, cancel, surveys, submitSurvey };
