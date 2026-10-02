function createFeeService(dependencies) {
  const persistence = dependencies.persistence;
  const ApiError = require("../../utils/common/http/api-error.util");
  const { feeRepo, paymentRepo } = dependencies.repositories["shared"];
  const { FEE_STATUS } = require("../../config/constants/status.config");
  const { ROLES } = require("../../config/constants/roles.config");
  const { buildExportScope } = dependencies.services["export-scope"];
  const { targetSchool, reference } = dependencies.services["write-scope"];
  const { schoolScope, objectId } = dependencies.services["data-scope"];
  const User = "user";
  const AcademicYear = "academic-year";
  const { normalizeLineItems, totalOf, recalculateLineItems, allocatePayment, withLineItemStatus, money } = dependencies.services["fee-invoice-accounting"];
  
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
    const rows = await persistence.rowsFind(filter, { populate: 'studentId academicYearId', limit: 200 });
    return rows.map(withLineItemStatus);
  };
  
  const createInvoice = async (actor, data) => {
    const lineItems = normalizeLineItems(data.lineItems);
    if (!data.studentId || !data.academicYearId || !data.title || (!lineItems.length && data.amount == null) || !data.dueDate) {
      throw new ApiError(400, 'Thiếu thông tin hóa đơn');
    }
    const amount = lineItems.length ? totalOf(lineItems) : money(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new ApiError(400, 'Tổng tiền hóa đơn phải lớn hơn 0');
    const schoolId = await targetSchool(actor, data.schoolId);
    await reference(User, data.studentId, schoolId, { role: ROLES.STUDENT });
    await reference(AcademicYear, data.academicYearId, schoolId);
    const invoice = await persistence.invoiceCreate({
      schoolId,
      studentId: data.studentId,
      academicYearId: data.academicYearId,
      title: data.title,
      category: data.category || lineItems[0]?.category || 'TUITION',
      description: data.description || '',
      lineItems,
      amount,
      dueDate: data.dueDate,
      note: data.note || '',
      reminderEnabled: data.reminderEnabled !== false,
      paidAmount: 0,
      status: FEE_STATUS.UNPAID,
    });
    return withLineItemStatus(refreshStatus(invoice));
  };
  
  const listDebtors = async (actor, query = {}) => {
    const { filter } = await buildExportScope(actor, 'fees', query);
    filter.$and.push({ $expr: { $gt: [{ $subtract: ['$amount', '$paidAmount'] }, 0] } });
    const rows = await persistence.rowsFind2(filter, { populate: 'studentId academicYearId', limit: 300 });
    return rows.filter(row => new Date(row.dueDate) < new Date() || row.status !== FEE_STATUS.PAID)
      .map(row => ({ ...withLineItemStatus(row), outstanding: Math.max(0, Number(row.amount) - Number(row.paidAmount || 0)) }));
  };
  
  const runDebtReminders = async (actor, { asOf = new Date(), minDaysOverdue = 0 } = {}) => {
    const now = new Date(asOf);
    if (!Number.isFinite(now.getTime())) throw new ApiError(400, 'asOf khong hop le');
    const days = Number(minDaysOverdue);
    if (!Number.isInteger(days) || days < 0 || days > 3650) throw new ApiError(400, 'minDaysOverdue khong hop le');
    const cutoff = new Date(now.getTime() - days * 86400000);
    const scope = await schoolScope(actor);
    const invoices = await persistence.invoicesFind({ ...scope, reminderEnabled: true, dueDate: { $lte: cutoff }, $expr: { $gt: [{ $subtract: ['$amount', '$paidAmount'] }, 0] } });
    let sent = 0;
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    for (const invoice of invoices) {
      const claimed = await persistence.claimedUpdateOne({ _id: invoice._id, $or: [{ lastReminderAt: null }, { lastReminderAt: { $lt: dayStart } }] }, { $set: { lastReminderAt: now, status: FEE_STATUS.OVERDUE } });
      if (claimed.modifiedCount !== 1) continue;
      const recipients = await persistence.recipientsFind({ schoolId: invoice.schoolId, $or: [{ _id: invoice.studentId }, { role: ROLES.PARENT, parentOf: invoice.studentId }] });
      if (!recipients.length) continue;
      const outstanding = Math.max(0, Number(invoice.amount) - Number(invoice.paidAmount || 0));
      await persistence.runDebtRemindersInsertMany(recipients.map(recipient => ({ userId: recipient._id, schoolId: invoice.schoolId, title: 'Fee payment reminder', message: `Invoice ${invoice.title} has an outstanding balance of ${outstanding}. Due date: ${new Date(invoice.dueDate).toISOString().slice(0, 10)}.`, type: 'FEE_REMINDER', meta: { invoiceId: invoice._id, outstanding } })));
      sent += recipients.length;
    }
    return { invoices: invoices.length, notifications: sent, asOf: now };
  };
  
  const recordPayment = async (actor, data) => {
    const { invoiceId, amount, method = 'CASH', note = '' } = data;
    if (!invoiceId || amount == null) throw new ApiError(400, 'Thiếu invoiceId/amount');
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) throw new ApiError(400, 'Số tiền phải lớn hơn 0');
  
    const invoice = await persistence.invoiceFindById(invoiceId);
    if (!invoice) throw new ApiError(404, 'Không tìm thấy hóa đơn');
    if (String(invoice.schoolId) !== String(actor.schoolId) && actor.role !== ROLES.SUPER_ADMIN) {
      throw new ApiError(403, 'Ngoài phạm vi');
    }
  
    if (!['CASH', 'TRANSFER'].includes(method)) throw new ApiError(400, 'Online payments must be confirmed by the gateway');
    try {
      return await persistence.recordPaymentTransaction(async session => {
        const current = await persistence.currentFindById(invoice._id, session);
        if (!current || Number(current.amount) - Number(current.paidAmount || 0) < amount) throw new ApiError(409, 'Payment exceeds outstanding amount');
        allocatePayment(current, amount);
        recalculateLineItems(current);
        refreshStatus(current);
        await persistence.recordPaymentSave(current, { session });
        const [payment] = await persistence.recordPaymentCreate([{
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
    return persistence.listPaymentsFind(filter, { populate: 'invoiceId studentId recordedBy', limit: 200 });
  };
  
  return { listInvoices, listDebtors, runDebtReminders, createInvoice, recordPayment, listPayments };
  
}

class FeeService {
  constructor(dependencies) {
    Object.assign(this, createFeeService(dependencies));
  }
}

module.exports = FeeService;
