const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const FeeInvoice = require('../models/FeeInvoice');
const OnlinePayment = require('../models/OnlinePayment');
const Payment = require('../models/Payment');
const { FEE_STATUS } = require('../constants/status');
const { ROLES } = require('../constants/roles');
const { objectId, schoolScope, personalStudentIds } = require('./dataScope');
const { getGateway } = require('./paymentGateway');

const roundMoney = value => Math.round(Number(value) * 100) / 100;

const invoiceFilter = async actor => {
  const filter = await schoolScope(actor);
  const ids = await personalStudentIds(actor);
  if (ids !== null) filter.studentId = { $in: ids };
  return filter;
};

const refreshInvoiceStatus = invoice => {
  if (invoice.paidAmount <= 0) {
    invoice.status = new Date(invoice.dueDate) < new Date() ? FEE_STATUS.OVERDUE : FEE_STATUS.UNPAID;
  } else if (invoice.paidAmount >= invoice.amount) {
    invoice.status = FEE_STATUS.PAID;
  } else {
    invoice.status = FEE_STATUS.PARTIAL;
  }
  return invoice;
};

const createOnlinePayment = async (actor, data = {}, context = {}) => {
  if (!data.invoiceId) throw new ApiError(400, 'Thiếu invoiceId');
  const invoice = await FeeInvoice.findOne({ _id: objectId(data.invoiceId, 'invoiceId'), ...(await invoiceFilter(actor)) });
  if (!invoice) throw new ApiError(404, 'Không tìm thấy hóa đơn trong phạm vi');
  const outstanding = roundMoney(Number(invoice.amount) - Number(invoice.paidAmount || 0));
  if (outstanding <= 0) throw new ApiError(409, 'Hóa đơn đã được thanh toán đủ');

  const provider = String(data.provider || process.env.PAYMENT_DEFAULT_PROVIDER || 'VNPAY').toUpperCase();
  const gateway = getGateway(provider);
  const requestKey = data.clientRequestId
    ? `${invoice.schoolId}:${invoice.studentId}:${String(data.clientRequestId).trim().slice(0, 120)}` : null;
  if (requestKey) {
    const previous = await OnlinePayment.findOne({ requestKey });
    if (previous) {
      if (String(previous.invoiceId) !== String(invoice._id) || previous.provider !== provider) throw new ApiError(409, 'Mã yêu cầu đã dùng cho giao dịch khác');
      return previous;
    }
  }
  const active = await OnlinePayment.findOne({ invoiceId: invoice._id, provider, status: 'PENDING', expiresAt: { $gt: new Date() } });
  if (active) return active;

  const orderId = `${provider}${new mongoose.Types.ObjectId()}`;
  const ttl = Number(process.env.ONLINE_PAYMENT_TTL_MS || 900000);
  if (!Number.isFinite(ttl) || ttl < 60000 || ttl > 86400000) throw new ApiError(503, 'ONLINE_PAYMENT_TTL_MS không hợp lệ');
  const expiresAt = new Date(Date.now() + ttl);
  const gatewayPayment = await gateway.createPayment({
    orderId,
    amount: outstanding,
    invoice,
    returnUrl: data.returnUrl,
    ipAddress: context.ipAddress,
    expiresAt,
  });
  try {
    return await OnlinePayment.create({
      schoolId: invoice.schoolId,
      invoiceId: invoice._id,
      studentId: invoice.studentId,
      amount: outstanding,
      provider,
      providerOrderId: orderId,
      requestKey,
      status: 'PENDING',
      checkoutUrl: gatewayPayment.checkoutUrl,
      returnUrl: gatewayPayment.payload?.vnp_ReturnUrl || data.returnUrl || '',
      expiresAt,
    });
  } catch (error) {
    if (error.code === 11000 && requestKey) return OnlinePayment.findOne({ requestKey });
    throw error;
  }
};

const listOnlinePayments = async (actor, query = {}) => {
  const filter = await invoiceFilter(actor);
  if (query.invoiceId) filter.invoiceId = objectId(query.invoiceId, 'invoiceId');
  if (query.status) filter.status = String(query.status).toUpperCase();
  return OnlinePayment.find(filter)
    .populate('invoiceId', 'title amount paidAmount dueDate status')
    .populate('studentId', 'name code')
    .sort({ createdAt: -1 }).limit(200);
};

const getOnlinePayment = async (actor, id) => {
  const row = await OnlinePayment.findOne({ _id: objectId(id), ...(await invoiceFilter(actor)) })
    .populate('invoiceId', 'title amount paidAmount dueDate status')
    .populate('studentId', 'name code');
  if (!row) throw new ApiError(404, 'Không tìm thấy giao dịch');
  return row;
};

const webhook = async (providerName, payload = {}, signature) => {
  const provider = String(providerName || '').toUpperCase();
  const gateway = getGateway(provider);
  if (!gateway.verifyWebhook(payload, signature)) throw new ApiError(401, 'Chữ ký webhook không hợp lệ');
  const normalized = gateway.normalizeWebhook(payload);
  if (!normalized.orderId) throw new ApiError(400, 'Webhook thiếu mã giao dịch');
  const row = await OnlinePayment.findOne({ provider, providerOrderId: normalized.orderId });
  if (!row) throw new ApiError(404, 'Không tìm thấy giao dịch online');
  if (provider === 'VNPAY') validateVnpayPayload(payload, row);
  if (row.status === 'PAID' || row.status === 'FAILED' || row.status === 'CANCELLED') return row;

  const paidAmount = provider === 'VNPAY' ? Number(payload.vnp_Amount) / 100 : payload.amount != null ? Number(payload.amount)
    : payload.vnp_Amount != null ? Number(payload.vnp_Amount) / 100 : null;
  if (normalized.status === 'PAID' && paidAmount != null && roundMoney(paidAmount) !== roundMoney(row.amount)) {
    throw new ApiError(409, 'Số tiền webhook không khớp hóa đơn');
  }
  const status = normalized.status === 'PAID' ? 'PAID' : 'FAILED';
  if (status === 'FAILED') {
    return OnlinePayment.findOneAndUpdate(
      { _id: row._id, status: 'PENDING' },
      { $set: { status, gatewayTransactionId: normalized.transactionId || '', webhookPayload: payload } },
      { new: true }
    );
  }

  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const paid = await OnlinePayment.findOneAndUpdate(
        { _id: row._id, status: 'PENDING' },
        { $set: { status: 'PAID', paidAt: new Date(), gatewayTransactionId: normalized.transactionId || '', webhookPayload: payload } },
        { new: true, session }
      );
      if (!paid) {
        result = await OnlinePayment.findById(row._id).session(session);
        return;
      }
      const invoice = await FeeInvoice.findOne({ _id: paid.invoiceId }).session(session);
      if (!invoice) throw new ApiError(404, 'Không tìm thấy hóa đơn');
      const outstanding = roundMoney(Number(invoice.amount) - Number(invoice.paidAmount || 0));
      if (outstanding < roundMoney(paid.amount)) throw new ApiError(409, 'Hóa đơn đã được thu đủ hoặc bị vượt số tiền');
      invoice.paidAmount = roundMoney(Number(invoice.paidAmount || 0) + Number(paid.amount));
      refreshInvoiceStatus(invoice);
      await invoice.save({ session });
      await Payment.create([{
        schoolId: paid.schoolId,
        invoiceId: paid.invoiceId,
        studentId: paid.studentId,
        amount: paid.amount,
        method: 'ONLINE',
        recordedBy: null,
        onlinePaymentId: paid._id,
        gatewayTransactionId: paid.gatewayTransactionId,
        note: `Gateway ${paid.provider}`,
      }], { session });
      result = paid;
    });
  } finally {
    await session.endSession();
  }
  return result || OnlinePayment.findById(row._id);
};

const validateVnpayPayload = (payload, row) => {
  if (payload.vnp_TmnCode !== process.env.VNPAY_TMN_CODE) throw new ApiError(400, 'Sai mã website', 'VNPAY_MERCHANT');
  if (!/^\d{1,12}$/.test(payload.vnp_Amount || '') || Number(payload.vnp_Amount) !== Math.round(row.amount * 100)) throw new ApiError(409, 'Sai số tiền', 'VNPAY_AMOUNT');
  if (!/^\d{2}$/.test(payload.vnp_ResponseCode || '') || !/^\d{2}$/.test(payload.vnp_TransactionStatus || '') || !/^\d{1,15}$/.test(payload.vnp_TransactionNo || '')) throw new ApiError(400, 'Thiếu kết quả giao dịch');
};
const vnpayResult = async payload => {
  const gateway = getGateway('VNPAY');
  if (!gateway.verifyWebhook(payload, payload.vnp_SecureHash)) throw new ApiError(401, 'Chữ ký VNPay không hợp lệ');
  if (typeof payload.vnp_TxnRef !== 'string') throw new ApiError(400, 'Thiếu mã giao dịch');
  const row = await OnlinePayment.findOne({ provider: 'VNPAY', providerOrderId: payload.vnp_TxnRef });
  if (!row) throw new ApiError(404, 'Không tìm thấy giao dịch');
  validateVnpayPayload(payload, row);
  return row;
};
const vnpayIpn = async payload => {
  try {
    const row = await vnpayResult(payload);
    if (row.status !== 'PENDING') return { RspCode: '02', Message: 'Order already confirmed' };
    await webhook('VNPAY', payload, payload.vnp_SecureHash);
    return { RspCode: '00', Message: 'Confirm Success' };
  } catch (error) {
    const code = error.statusCode === 401 ? '97' : error.statusCode === 404 ? '01' : error.errorCode === 'VNPAY_AMOUNT' ? '04' : '99';
    return { RspCode: code, Message: { '97': 'Invalid signature', '01': 'Order not found', '04': 'Invalid amount', '99': 'Unable to confirm payment' }[code] };
  }
};
const vnpayReturn = async payload => {
  const row = await vnpayResult(payload);
  return { orderId: row.providerOrderId, status: row.status, gatewayStatus: getGateway('VNPAY').normalizeWebhook(payload).status };
};
module.exports = { createOnlinePayment, listOnlinePayments, getOnlinePayment, webhook, vnpayIpn, vnpayReturn };
