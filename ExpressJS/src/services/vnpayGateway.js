const crypto = require('node:crypto');
const net = require('node:net');
const ApiError = require('../utils/ApiError');

const fields = payload => Object.keys(payload)
  .filter(key => key.startsWith('vnp_') && !['vnp_SecureHash', 'vnp_SecureHashType'].includes(key))
  .sort().map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(payload[key])).replace(/%20/g, '+')}`).join('&');
const timestamp = date => new Date(date.getTime() + 7 * 3600000).toISOString().replace(/\D/g, '').slice(0, 14);
const checksum = payload => crypto.createHmac('sha512', process.env.VNPAY_HASH_SECRET).update(fields(payload)).digest('hex');
const returnUrl = () => {
  const value = process.env.VNPAY_RETURN_URL;
  let url;
  try { url = new URL(value); } catch { throw new ApiError(503, 'Chưa cấu hình VNPAY_RETURN_URL hợp lệ'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) throw new ApiError(503, 'VNPAY_RETURN_URL không hợp lệ');
  return url.toString();
};

module.exports = {
  provider: 'VNPAY', fields, timestamp,
  async createPayment({ orderId, amount, ipAddress, expiresAt }) {
    if (!process.env.VNPAY_TMN_CODE || !process.env.VNPAY_HASH_SECRET) throw new ApiError(503, 'Chưa cấu hình VNPay');
    if (!Number.isSafeInteger(amount) || amount < 1 || amount * 100 > 999999999999) throw new ApiError(400, 'Số tiền VNPay phải là số nguyên VND hợp lệ');
    const ip = String(ipAddress || '').replace(/^::ffff:/, '');
    const payload = {
      vnp_Version: '2.1.0', vnp_Command: 'pay', vnp_TmnCode: process.env.VNPAY_TMN_CODE,
      vnp_Amount: amount * 100, vnp_CurrCode: 'VND', vnp_TxnRef: orderId,
      vnp_OrderInfo: `Thanh toan hoc phi ${orderId}`, vnp_OrderType: 'other', vnp_Locale: 'vn',
      vnp_ReturnUrl: returnUrl(), vnp_IpAddr: net.isIP(ip) ? ip : '127.0.0.1',
      vnp_CreateDate: timestamp(new Date()), vnp_ExpireDate: timestamp(expiresAt),
    };
    const base = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    return { checkoutUrl: `${base}?${fields(payload)}&vnp_SecureHash=${checksum(payload)}`, payload };
  },
  verifyWebhook(payload, signature) {
    if (!process.env.VNPAY_HASH_SECRET || typeof signature !== 'string' || !/^[a-f0-9]{128}$/i.test(signature)) return false;
    if (Object.entries(payload).some(([k, v]) => k.startsWith('vnp_') && !['string', 'number'].includes(typeof v))) return false;
    return crypto.timingSafeEqual(Buffer.from(checksum(payload), 'hex'), Buffer.from(signature, 'hex'));
  },
  normalizeWebhook(payload) {
    return { orderId: payload.vnp_TxnRef, transactionId: payload.vnp_TransactionNo,
      status: payload.vnp_ResponseCode === '00' && payload.vnp_TransactionStatus === '00' ? 'PAID' : 'FAILED' };
  },
};
