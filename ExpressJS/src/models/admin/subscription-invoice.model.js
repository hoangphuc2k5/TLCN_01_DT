const mongoose = require('mongoose');

const subscriptionInvoiceSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
    plan: { type: String, enum: ['FREE', 'BASIC', 'PREMIUM'], required: true },
    amount: { type: Number, required: true, min: 0 },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    status: { type: String, enum: ['UNPAID', 'PAID', 'CANCELLED'], default: 'UNPAID' },
    paidAt: { type: Date, default: null },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

subscriptionInvoiceSchema.index({ schoolId: 1, createdAt: -1 });

module.exports = mongoose.model('SubscriptionInvoice', subscriptionInvoiceSchema);
