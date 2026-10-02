const { request: requestDto, response: responseDto } = require('../../dtos/admin/subscription.dto');
const asyncHandler = require("../../utils/common/http/async-handler.util");
const { success } = require("../../utils/common/http/response.util");
const subscriptionService = require("../../config/container").services["subscription"];

const listSubscriptions = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await subscriptionService.listSubscriptions(req.user, requestDto.query(req))));
});

const upsertSubscription = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await subscriptionService.upsertSubscription(req.user, requestDto.body(req))), 'Lưu gói dịch vụ thành công');
});

const listSubInvoices = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await subscriptionService.listInvoices(req.user, requestDto.query(req))));
});

const createSubInvoice = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await subscriptionService.createInvoice(req.user, requestDto.body(req))), 'Tạo hóa đơn gia hạn thành công', 201);
});

const markSubInvoicePaid = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await subscriptionService.markInvoicePaid(req.user, requestDto.params(req).id)), 'Đã ghi nhận thanh toán');
});

module.exports = { listSubscriptions, upsertSubscription, listSubInvoices, createSubInvoice, markSubInvoicePaid };
