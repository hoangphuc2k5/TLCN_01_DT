const mongoose = require('mongoose');
const { FEE_STATUS } = require('../constants/status');

const feeInvoiceSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: Object.values(FEE_STATUS), default: FEE_STATUS.UNPAID },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

feeInvoiceSchema.index({ schoolId: 1, studentId: 1, status: 1 });

module.exports = mongoose.model('FeeInvoice', feeInvoiceSchema);
