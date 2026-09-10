const ApiError = require('../utils/ApiError');
const { feeRepo, paymentRepo } = require('../repositories');
const { FEE_STATUS } = require('../constants/status');
const { ROLES } = require('../constants/roles');
const { buildExportScope } = require('./exportScopeService');
const { targetSchool, reference } = require('./writeScope');
const { schoolScope, objectId } = require('./dataScope');
const User = require('../models/User');
const AcademicYear = require('../models/AcademicYear');
const Notification = require('../models/Notification');

const refreshStatus = (invoice) => {
  if (invoice.paidAmount <= 0) {
    invoice.status =
      new Date(invoice.dueDate) < new Date() ? FEE_STATUS.OVERDUE : FEE_STATUS.UNPAID;
  } else if (invoice.paidAmount >= invoice.amount) {
    invoice.status = FEE_STATUS.PAID;
  } else {
    invoice.status = FEE_STATUS.PARTIAL;
  }
  return invoice;
};

const listInvoices = async (actor, query = {}) => {
  const { filter } = await buildExportScope(actor, 'fees', query);
  if (query.status) {
    if (!Object.values(FEE_STATUS).includes(query.status)) throw new ApiError(400, 'Invalid fee status');
    filter.$and.push({ status: query.status });
  }
  return feeRepo.find(filter, { populate: 'studentId academicYearId', limit: 200 });
};

const createInvoice = async (actor, data) => {
  if (!data.studentId || !data.academicYearId || !data.title || data.amount == null || !data.dueDate) {
    throw new ApiError(400, 'Thiếu thông tin hóa đơn');
  }
  const schoolId = await targetSchool(actor, data.schoolId);
  await reference(User, data.studentId, schoolId, { role: ROLES.STUDENT });
  await reference(AcademicYear, data.academicYearId, schoolId);
  const invoice = await feeRepo.create({
    schoolId,
    studentId: data.studentId,
    academicYearId: data.academicYearId,
    title: data.title,
    category: data.category || 'TUITION',
    description: data.description || '',
    amount: data.amount,
    dueDate: data.dueDate,
    note: data.note || '',
    reminderEnabled: data.reminderEnabled !== false,
    paidAmount: 0,
    status: FEE_STATUS.UNPAID,
  });
  return refreshStatus(invoice);
};

const listDebtors = async (actor, query = {}) => {
  const { filter } = await buildExportScope(actor, 'fees', query);
  filter.$and.push({ $expr: { $gt: [{ $subtract: ['$amount', '$paidAmount'] }, 0] } });
  const rows = await feeRepo.find(filter, { populate: 'studentId academicYearId', limit: 300 });
  return rows.filter(row => new Date(row.dueDate) < new Date() || row.status !== FEE_STATUS.PAID)
    .map(row => ({ ...row.toObject(), outstanding: Math.max(0, Number(row.amount) - Number(row.paidAmount || 0)) }));
};

const runDebtReminders = async (actor, { asOf = new Date(), minDaysOverdue = 0 } = {}) => {
  const now = new Date(asOf);
  if (!Number.isFinite(now.getTime())) throw new ApiError(400, 'asOf khong hop le');
  const days = Number(minDaysOverdue);
  if (!Number.isInteger(days) || days < 0 || days > 3650) throw new ApiError(400, 'minDaysOverdue khong hop le');
  const cutoff = new Date(now.getTime() - days * 86400000);
  const scope = await schoolScope(actor);
  const invoices = await require('../models/FeeInvoice').find({ ...scope, reminderEnabled: true, dueDate: { $lte: cutoff }, $expr: { $gt: [{ $subtract: ['$amount', '$paidAmount'] }, 0] } }).limit(500);
  let sent = 0;
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  for (const invoice of invoices) {
    const claimed = await require('../models/FeeInvoice').updateOne({ _id: invoice._id, $or: [{ lastReminderAt: null }, { lastReminderAt: { $lt: dayStart } }] }, { $set: { lastReminderAt: now, status: FEE_STATUS.OVERDUE } });
    if (claimed.modifiedCount !== 1) continue;
    const recipients = await User.find({ schoolId: invoice.schoolId, $or: [{ _id: invoice.studentId }, { role: ROLES.PARENT, parentOf: invoice.studentId }] }).select('_id role');
    if (!recipients.length) continue;
    const outstanding = Math.max(0, Number(invoice.amount) - Number(invoice.paidAmount || 0));
    await Notification.insertMany(recipients.map(recipient => ({ userId: recipient._id, schoolId: invoice.schoolId, title: 'Fee payment reminder', message: `Invoice ${invoice.title} has an outstanding balance of ${outstanding}. Due date: ${new Date(invoice.dueDate).toISOString().slice(0, 10)}.`, type: 'FEE_REMINDER', meta: { invoiceId: invoice._id, outstanding } })));
    sent += recipients.length;
  }
  return { invoices: invoices.length, notifications: sent, asOf: now };
};

const recordPayment = async (actor, data) => {
  const { invoiceId, amount, method = 'CASH', note = '' } = data;
  if (!invoiceId || amount == null) throw new ApiError(400, 'Thiếu invoiceId/amount');
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) throw new ApiError(400, 'Số tiền phải lớn hơn 0');

  const invoice = await feeRepo.findById(invoiceId);
  if (!invoice) throw new ApiError(404, 'Không tìm thấy hóa đơn');
  if (String(invoice.schoolId) !== String(actor.schoolId) && actor.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Ngoài phạm vi');
  }

  if (!['CASH', 'TRANSFER'].includes(method)) throw new ApiError(400, 'Online payments must be confirmed by the gateway');
  const mongoose = require('mongoose');
  const FeeInvoice = require('../models/FeeInvoice');
  const Payment = require('../models/Payment');
  try {
    return await mongoose.connection.transaction(async session => {
      const current = await FeeInvoice.findById(invoice._id).session(session);
      if (!current || Number(current.amount) - Number(current.paidAmount || 0) < amount) throw new ApiError(409, 'Payment exceeds outstanding amount');
      current.paidAmount = Math.round((Number(current.paidAmount || 0) + amount) * 100) / 100;
      refreshStatus(current);
      await current.save({ session });
      const [payment] = await Payment.create([{
        schoolId: current.schoolId, invoiceId: current._id, studentId: current.studentId,
        amount, method, recordedBy: actor._id, note,
      }], { session });
      return { payment, invoice: current };
    });
  } catch (error) {
    if (error.code === 20) throw new ApiError(503, 'Payment recording requires a MongoDB replica set');
    throw error;
  }
};

const listPayments = async (actor, query = {}) => {
  const filter = await schoolScope(actor);
  if (query.invoiceId) filter.invoiceId = objectId(query.invoiceId, 'invoiceId');
  return paymentRepo.find(filter, { populate: 'invoiceId studentId recordedBy', limit: 200 });
};

module.exports = { listInvoices, listDebtors, runDebtReminders, createInvoice, recordPayment, listPayments };
