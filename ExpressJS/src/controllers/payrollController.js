const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const feeService = require('../services/feeService');
const payroll = require('../services/payrollService');

exports.debtors = asyncHandler(async (req, res) => success(res, await feeService.listDebtors(req.user, req.query)));
exports.reminders = asyncHandler(async (req, res) => success(res, await feeService.runDebtReminders(req.user, req.body || {}), 'Debt reminders queued'));
exports.list = asyncHandler(async (req, res) => success(res, await payroll.list(req.user, req.query)));
exports.create = asyncHandler(async (req, res) => success(res, await payroll.create(req.user, req.body), 'Payroll created', 201));
exports.status = asyncHandler(async (req, res) => success(res, await payroll.updateStatus(req.user, req.params.id, req.body?.status), 'Payroll status updated'));
