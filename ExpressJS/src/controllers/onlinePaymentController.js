const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const service = require('../services/onlinePaymentService');

const create = asyncHandler(async (req, res) => success(res, await service.createOnlinePayment(req.user, req.body), 'Tạo giao dịch thanh toán online thành công', 201));
const list = asyncHandler(async (req, res) => success(res, await service.listOnlinePayments(req.user, req.query)));
const get = asyncHandler(async (req, res) => success(res, await service.getOnlinePayment(req.user, req.params.id)));
const webhook = asyncHandler(async (req, res) => success(res, await service.webhook(req.params.provider, req.body, req.get('x-payment-signature') || req.get('x-signature'))));

module.exports = { create, list, get, webhook };
