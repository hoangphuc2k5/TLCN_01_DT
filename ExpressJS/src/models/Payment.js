const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeInvoice', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['CASH', 'TRANSFER', 'ONLINE'], default: 'CASH' },
    paidAt: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

paymentSchema.index({ schoolId: 1, invoiceId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
