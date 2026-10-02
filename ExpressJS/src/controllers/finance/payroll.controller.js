const { request: requestDto, response: responseDto } = require('../../dtos/finance/payroll.dto');
const asyncHandler = require("../../utils/common/http/async-handler.util");
const { success } = require("../../utils/common/http/response.util");
const feeService = require("../../config/container").services["fee"];
const payroll = require("../../config/container").services["payroll"];

exports.debtors = asyncHandler(async (req, res) => success(res, responseDto.fromService(await feeService.listDebtors(req.user, requestDto.query(req)))));
exports.reminders = asyncHandler(async (req, res) => success(res, responseDto.fromService(await feeService.runDebtReminders(req.user, requestDto.body(req) || {})), 'Debt reminders queued'));
exports.list = asyncHandler(async (req, res) => success(res, responseDto.fromService(await payroll.list(req.user, requestDto.query(req)))));
exports.create = asyncHandler(async (req, res) => success(res, responseDto.fromService(await payroll.create(req.user, requestDto.body(req))), 'Payroll created', 201));
exports.status = asyncHandler(async (req, res) => success(res, responseDto.fromService(await payroll.updateStatus(req.user, requestDto.params(req).id, requestDto.body(req)?.status)), 'Payroll status updated'));
