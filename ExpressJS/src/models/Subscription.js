const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, unique: true },
    plan: { type: String, enum: ['FREE', 'BASIC', 'PREMIUM'], default: 'FREE' },
    maxStudents: { type: Number, default: 100 },
    maxTeachers: { type: Number, default: 20 },
    storageGb: { type: Number, default: 5 },
    features: [{ type: String }],
    expiresAt: { type: Date, default: null },
    status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
