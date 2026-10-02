const mongoose = require('mongoose');
const { FEE_STATUS } = require("../../config/constants/status.config");

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

feeInvoiceSchema.index({ schoolId: 1, studentId: 1, status: 1 });

module.exports = mongoose.model('FeeInvoice', feeInvoiceSchema);
