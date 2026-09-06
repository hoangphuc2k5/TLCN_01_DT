const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: 'INFO' },
    isRead: { type: Boolean, default: false },
    emailState: { type: String, enum: ['NOT_REQUESTED', 'PENDING', 'ENQUEUED'], default: 'NOT_REQUESTED', select: false },
    emailRunAt: { type: Date, default: Date.now, select: false },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ emailState: 1, createdAt: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
