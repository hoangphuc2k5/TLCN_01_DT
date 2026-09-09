const crypto = require('node:crypto');
const ApiError = require('../utils/ApiError');

const sortObject = (value) => {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((out, key) => {
    out[key] = sortObject(value[key]);
    return out;
  }, {});
};

const canonical = payload => JSON.stringify(sortObject(payload));
const sign = (payload, secret, algorithm = 'sha256') => crypto
  .createHmac(algorithm, secret).update(canonical(payload)).digest('hex');
const safeEqual = (left, right) => {
  if (!left || !right) return false;
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const mockSecret = () => {
  const secret = process.env.PAYMENT_MOCK_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-mock-payment-secret');
  if (!secret) throw new ApiError(503, 'Chưa cấu hình PAYMENT_MOCK_SECRET');
  return secret;
};

const mockGateway = {
  provider: 'MOCK',
  async createPayment({ orderId, amount, returnUrl }) {
    const payload = { orderId, amount: Number(amount), status: 'PENDING' };
    const signature = sign(payload, mockSecret());
    const base = process.env.MOCK_PAYMENT_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/mock-payment`;
    const url = new URL(base);
    url.searchParams.set('orderId', orderId);
    url.searchParams.set('amount', String(amount));
    url.searchParams.set('signature', signature);
    if (returnUrl) url.searchParams.set('returnUrl', returnUrl);
    return { checkoutUrl: url.toString(), payload };
  },
  verifyWebhook(payload, signature) {
    return safeEqual(sign(payload, mockSecret()), signature);
  },
  normalizeWebhook(payload) {
    return {
      orderId: payload.orderId,
      status: String(payload.status || '').toUpperCase(),
      transactionId: payload.transactionId || payload.orderId,
    };
  },
};

const vnpayFields = (payload) => Object.keys(payload)
  .filter(key => key.startsWith('vnp_') && key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType')
  .sort()
  .map(key => `${key}=${encodeURIComponent(String(payload[key])).replace(/%20/g, '+')}`)
  .join('&');

const vnpayGateway = {
  provider: 'VNPAY',
  async createPayment({ orderId, amount, returnUrl }) {
    const tmnCode = process.env.VNPAY_TMN_CODE;
    const secret = process.env.VNPAY_HASH_SECRET;
    if (!tmnCode || !secret) throw new ApiError(503, 'Chưa cấu hình VNPAY_TMN_CODE/VNPAY_HASH_SECRET');
    const payload = {
      vnp_Version: '2.1.0', vnp_Command: 'pay', vnp_TmnCode: tmnCode,
      vnp_Amount: Math.round(Number(amount) * 100), vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId, vnp_OrderInfo: `Thanh toan hoc phi ${orderId}`,
      vnp_OrderType: 'billpayment', vnp_Locale: 'vn', vnp_ReturnUrl: returnUrl || process.env.FRONTEND_URL || '',
      vnp_IpAddr: '127.0.0.1', vnp_CreateDate: new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14),
    };
    const query = vnpayFields(payload);
    const signature = crypto.createHmac('sha512', secret).update(query).digest('hex');
    const base = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    return { checkoutUrl: `${base}?${query}&vnp_SecureHash=${signature}`, payload };
  },
  verifyWebhook(payload, signature) {
    const secret = process.env.VNPAY_HASH_SECRET;
    if (!secret || !signature) return false;
    const query = vnpayFields(payload);
    return safeEqual(crypto.createHmac('sha512', secret).update(query).digest('hex'), signature);
  },
  normalizeWebhook(payload) {
    return {
      orderId: payload.vnp_TxnRef,
      status: String(payload.vnp_ResponseCode) === '00' ? 'PAID' : 'FAILED',
      transactionId: payload.vnp_TransactionNo || payload.vnp_TxnRef,
    };
  },
};

const momoGateway = {
  provider: 'MOMO',
  async createPayment({ orderId, amount, returnUrl }) {
    const endpoint = process.env.MOMO_CHECKOUT_URL;
    const secret = process.env.MOMO_SECRET_KEY;
    if (!endpoint || !secret) throw new ApiError(503, 'Chưa cấu hình MOMO_CHECKOUT_URL/MOMO_SECRET_KEY');
    const payload = { orderId, amount: Number(amount), returnUrl: returnUrl || process.env.FRONTEND_URL || '' };
    const signature = sign(payload, secret);
    const url = new URL(endpoint);
    Object.entries(payload).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    url.searchParams.set('signature', signature);
    return { checkoutUrl: url.toString(), payload };
  },
  verifyWebhook(payload, signature) {
    return !!process.env.MOMO_SECRET_KEY && safeEqual(sign(payload, process.env.MOMO_SECRET_KEY), signature);
  },
  normalizeWebhook(payload) {
    return {
      orderId: payload.orderId || payload.order_id,
      status: String(payload.resultCode ?? payload.status).toUpperCase() === '0' || String(payload.status).toUpperCase() === 'PAID' ? 'PAID' : 'FAILED',
      transactionId: payload.transId || payload.transactionId || payload.orderId,
    };
  },
};

const gateways = { MOCK: mockGateway, MOMO: momoGateway, VNPAY: vnpayGateway };
const getGateway = provider => {
  const key = String(provider || 'MOCK').toUpperCase();
  const gateway = gateways[key];
  if (!gateway) throw new ApiError(400, 'Cổng thanh toán không hợp lệ');
  return gateway;
};

module.exports = { getGateway, canonical, sign };
