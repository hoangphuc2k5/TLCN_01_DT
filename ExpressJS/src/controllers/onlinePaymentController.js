const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const service = require('../services/onlinePaymentService');

const create = asyncHandler(async (req, res) => success(res, await service.createOnlinePayment(req.user, req.body, { ipAddress: req.ip }), 'Tạo giao dịch thanh toán online thành công', 201));
const list = asyncHandler(async (req, res) => success(res, await service.listOnlinePayments(req.user, req.query)));
const get = asyncHandler(async (req, res) => success(res, await service.getOnlinePayment(req.user, req.params.id)));
const webhook = asyncHandler(async (req, res) => success(res, await service.webhook(req.params.provider, req.body, req.get('x-payment-signature') || req.get('x-signature'))));

const vnpayIpn = asyncHandler(async (req, res) => res.json(await service.vnpayIpn(req.query)));
const frontendReturnUrl = query => {
  const target = new URL('/payments/vnpay-return', process.env.FRONTEND_URL || 'http://localhost:5173');
  Object.entries(query || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach(item => target.searchParams.append(key, String(item)));
    else if (value != null) target.searchParams.append(key, String(value));
  });
  return target.toString();
};

// Match KeyhubStore's browser flow: VNPay returns to the API and the API sends
// the browser to the result page. JSON clients can still verify the same return
// payload without a redirect.
const vnpayReturn = async (req, res, next) => {
  const browserReturn = /\btext\/html\b/i.test(req.get('accept') || '');
  try {
    const result = await service.vnpayReturn(req.query);
    if (browserReturn) return res.redirect(302, frontendReturnUrl(req.query));
    return success(res, result);
  } catch (error) {
    if (browserReturn) return res.redirect(302, frontendReturnUrl(req.query));
    return next(error);
  }
};
module.exports = { create, list, get, webhook, vnpayIpn, vnpayReturn };
