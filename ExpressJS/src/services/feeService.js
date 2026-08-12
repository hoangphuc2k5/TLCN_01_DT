const ApiError = require('../utils/ApiError');
const { feeRepo, paymentRepo } = require('../repositories');
const { FEE_STATUS } = require('../constants/status');
const { ROLES } = require('../constants/roles');

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
  const filter = {};
  if (actor.schoolId) filter.schoolId = actor.schoolId;
  if (query.status) filter.status = query.status;
  if (query.studentId) filter.studentId = query.studentId;
  if (actor.role === ROLES.STUDENT) filter.studentId = actor._id;
  if (actor.role === ROLES.PARENT) filter.studentId = { $in: actor.parentOf || [] };
  return feeRepo.find(filter, { populate: 'studentId academicYearId', limit: 200 });
};

const createInvoice = async (actor, data) => {
  if (!data.studentId || !data.academicYearId || !data.title || data.amount == null || !data.dueDate) {
    throw new ApiError(400, 'Thiếu thông tin hóa đơn');
  }
  const invoice = await feeRepo.create({
    schoolId: actor.schoolId,
    studentId: data.studentId,
    academicYearId: data.academicYearId,
    title: data.title,
    amount: data.amount,
    dueDate: data.dueDate,
    note: data.note || '',
    paidAmount: 0,
    status: FEE_STATUS.UNPAID,
  });
  return refreshStatus(invoice);
};

const recordPayment = async (actor, data) => {
  const { invoiceId, amount, method = 'CASH', note = '' } = data;
  if (!invoiceId || amount == null) throw new ApiError(400, 'Thiếu invoiceId/amount');

  const invoice = await feeRepo.findById(invoiceId);
  if (!invoice) throw new ApiError(404, 'Không tìm thấy hóa đơn');
  if (String(invoice.schoolId) !== String(actor.schoolId) && actor.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Ngoài phạm vi');
  }

  const payment = await paymentRepo.create({
    schoolId: invoice.schoolId,
    invoiceId,
    studentId: invoice.studentId,
    amount,
    method,
    recordedBy: actor._id,
    note,
  });

  invoice.paidAmount += Number(amount);
  refreshStatus(invoice);
  await invoice.save();

  return { payment, invoice };
};

const listPayments = async (actor, query = {}) => {
  const filter = {};
  if (actor.schoolId) filter.schoolId = actor.schoolId;
  if (query.invoiceId) filter.invoiceId = query.invoiceId;
  return paymentRepo.find(filter, { populate: 'invoiceId studentId recordedBy', limit: 200 });
};

module.exports = { listInvoices, createInvoice, recordPayment, listPayments };
