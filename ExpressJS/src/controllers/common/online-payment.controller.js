const requestDto = require('../../dtos/common/online-payment.request.dto');
const responseDto = require('../../dtos/common/online-payment.response.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const service = require("../../config/container").services["online-payment"];

const create = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.createOnlinePayment(req.user, requestDto.body(req), { ipAddress: req.ip })), 'Tạo giao dịch thanh toán online thành công', 201));
const list = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.listOnlinePayments(req.user, requestDto.query(req)))));
const get = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.getOnlinePayment(req.user, requestDto.params(req).id))));
const webhook = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.webhook(requestDto.params(req).provider, requestDto.body(req), req.get('x-payment-signature') || req.get('x-signature')))));

const vnpayIpn = asyncHandler(async (req, res) => res.json(responseDto.fromPayload(await service.vnpayIpn(requestDto.query(req)))));
const vnpayReturn = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.vnpayReturn(requestDto.query(req)))));
module.exports = { create, list, get, webhook, vnpayIpn, vnpayReturn };
