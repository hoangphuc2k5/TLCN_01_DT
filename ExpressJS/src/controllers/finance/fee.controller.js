const { request: requestDto, response: responseDto } = require('../../dtos/finance/fee.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const feeService = require("../../config/container").services["fee"];

const listInvoices = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await feeService.listInvoices(req.user, requestDto.query(req))));
});

const createInvoice = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await feeService.createInvoice(req.user, requestDto.body(req))), 'Tạo hóa đơn thành công', 201);
});

const recordPayment = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await feeService.recordPayment(req.user, requestDto.body(req))), 'Ghi nhận thanh toán thành công');
});

const listPayments = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await feeService.listPayments(req.user, requestDto.query(req))));
});

module.exports = { listInvoices, createInvoice, recordPayment, listPayments };
