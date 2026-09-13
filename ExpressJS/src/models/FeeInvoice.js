const mongoose = require('mongoose');
const { FEE_STATUS } = require('../constants/status');

const feeCategories = ['TUITION', 'OTHER', 'BOARDING', 'TRANSPORT', 'ACTIVITY'];
const feeLineItemSchema = new mongoose.Schema({
  code: { type: String, default: '', trim: true, maxlength: 50 },
  name: { type: String, required: true, trim: true, maxlength: 200 },
  category: { type: String, enum: feeCategories, default: 'TUITION' },
  description: { type: String, default: '', trim: true, maxlength: 500 },
  quantity: { type: Number, required: true, min: 0.01, default: 1 },
  unitAmount: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
}, { _id: true });

const feeInvoiceSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    title: { type: String, required: true },
    category: { type: String, enum: feeCategories, default: 'TUITION' },
    description: { type: String, default: '', maxlength: 1000 },
    lineItems: {
      type: [feeLineItemSchema],
      default: [],
      validate: { validator: value => value.length <= 50, message: 'Hóa đơn có tối đa 50 khoản thu' },
    },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: Object.values(FEE_STATUS), default: FEE_STATUS.UNPAID },
    note: { type: String, default: '' },
    reminderEnabled: { type: Boolean, default: true },
    lastReminderAt: { type: Date, default: null },
  },
  { timestamps: true }
);

feeInvoiceSchema.pre('validate', function calculateLineItemTotals(next) {
  if (this.lineItems?.length) {
    for (const item of this.lineItems) {
      item.amount = Math.round(Number(item.quantity) * Number(item.unitAmount) * 100) / 100;
      if (Number(item.paidAmount || 0) > item.amount) return next(new Error('Số tiền đã thu của khoản mục vượt thành tiền'));
    }
    this.amount = Math.round(this.lineItems.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
  }
  next();
});

feeInvoiceSchema.index({ schoolId: 1, studentId: 1, status: 1 });

module.exports = mongoose.model('FeeInvoice', feeInvoiceSchema);
