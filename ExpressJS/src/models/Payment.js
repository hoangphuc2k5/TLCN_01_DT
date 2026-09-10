const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeInvoice', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['CASH', 'TRANSFER', 'ONLINE'], default: 'CASH' },
    paidAt: { type: Date, default: Date.now },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function requiredRecordedBy() { return this.method !== 'ONLINE'; },
    },
    onlinePaymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'OnlinePayment' },
    gatewayTransactionId: { type: String, default: '' },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

paymentSchema.index({ schoolId: 1, invoiceId: 1 });
paymentSchema.index({ onlinePaymentId: 1 }, { unique: true, partialFilterExpression: { onlinePaymentId: { $type: 'objectId' } } });

module.exports = mongoose.model('Payment', paymentSchema);
