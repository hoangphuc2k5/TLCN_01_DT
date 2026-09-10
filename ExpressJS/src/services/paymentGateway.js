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

const vnpayGateway = require('./vnpayGateway');

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
  if (key === 'MOCK' && !['test', 'development'].includes(process.env.NODE_ENV)) throw new ApiError(503, 'Mock payment is disabled outside local testing');
  const gateway = gateways[key];
  if (!gateway) throw new ApiError(400, 'Cổng thanh toán không hợp lệ');
  return gateway;
};

module.exports = { getGateway, canonical, sign };
