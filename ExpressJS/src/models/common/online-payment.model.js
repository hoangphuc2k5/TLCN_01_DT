const mongoose = require('mongoose');

const onlinePaymentSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeInvoice', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1 },
    provider: { type: String, enum: ['MOCK', 'MOMO', 'VNPAY'], required: true },
    providerOrderId: { type: String, required: true, trim: true },
    requestKey: { type: String },
    status: { type: String, enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED'], default: 'PENDING' },
    checkoutUrl: { type: String, required: true },
    returnUrl: { type: String, default: '' },
    gatewayTransactionId: { type: String, default: '' },
    webhookPayload: { type: mongoose.Schema.Types.Mixed, default: null },
    expiresAt: { type: Date, required: true },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

onlinePaymentSchema.index({ provider: 1, providerOrderId: 1 }, { unique: true });
onlinePaymentSchema.index({ schoolId: 1, invoiceId: 1, status: 1 });
onlinePaymentSchema.index({ requestKey: 1 }, { unique: true, partialFilterExpression: { requestKey: { $type: 'string' } } });

module.exports = mongoose.model('OnlinePayment', onlinePaymentSchema);
