const ApiError = require('../utils/ApiError');

const categories = new Set(['TUITION', 'OTHER', 'BOARDING', 'TRANSPORT', 'ACTIVITY']);
const money = value => Math.round(Number(value) * 100) / 100;

const text = (value, field, max, required = false) => {
  const normalized = String(value || '').trim();
  if ((required && !normalized) || normalized.length > max) throw new ApiError(400, `${field} không hợp lệ`);
  return normalized;
};

const normalizeLineItems = (items = []) => {
  if (items == null) return [];
  if (!Array.isArray(items) || items.length > 50) throw new ApiError(400, 'Danh sách khoản thu không hợp lệ');
  return items.map((item, index) => {
    const quantity = Number(item?.quantity ?? 1);
    const unitAmount = Number(item?.unitAmount);
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitAmount) || unitAmount < 0) {
      throw new ApiError(400, `Số lượng/đơn giá khoản thu ${index + 1} không hợp lệ`);
    }
    const category = String(item?.category || 'TUITION').toUpperCase();
    if (!categories.has(category)) throw new ApiError(400, `Loại khoản thu ${index + 1} không hợp lệ`);
    const amount = money(quantity * unitAmount);
    if (!Number.isSafeInteger(Math.round(amount * 100)) || amount <= 0) throw new ApiError(400, `Thành tiền khoản thu ${index + 1} không hợp lệ`);
    return {
      code: text(item?.code, 'Mã khoản thu', 50).toUpperCase(),
      name: text(item?.name, 'Tên khoản thu', 200, true),
      category,
      description: text(item?.description, 'Mô tả khoản thu', 500),
      quantity,
      unitAmount: money(unitAmount),
      amount,
      paidAmount: 0,
    };
  });
};

const totalOf = lineItems => money(lineItems.reduce((sum, item) => sum + Number(item.amount), 0));

const allocatePayment = (invoice, amount) => {
  let remaining = money(amount);
  if (!invoice.lineItems?.length) {
    invoice.paidAmount = money(Number(invoice.paidAmount || 0) + remaining);
    return invoice;
  }
  for (const item of invoice.lineItems) {
    if (remaining <= 0) break;
    const outstanding = money(Number(item.amount) - Number(item.paidAmount || 0));
    const applied = Math.min(outstanding, remaining);
    item.paidAmount = money(Number(item.paidAmount || 0) + applied);
    remaining = money(remaining - applied);
  }
  if (remaining > 0) throw new ApiError(409, 'Thanh toán vượt số tiền còn lại của các khoản mục');
  invoice.paidAmount = money(Number(invoice.paidAmount || 0) + Number(amount));
  return invoice;
};

const withLineItemStatus = invoice => {
  const row = invoice.toObject ? invoice.toObject() : invoice;
  return {
    ...row,
    lineItems: (row.lineItems || []).map(item => ({
      ...item,
      outstanding: money(Number(item.amount) - Number(item.paidAmount || 0)),
      status: Number(item.paidAmount || 0) >= Number(item.amount) ? 'PAID' : Number(item.paidAmount || 0) > 0 ? 'PARTIAL' : 'UNPAID',
    })),
  };
};

module.exports = { normalizeLineItems, totalOf, allocatePayment, withLineItemStatus, money };
