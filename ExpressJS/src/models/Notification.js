const mongoose = require('mongoose');
const eventBus = require('../patterns/eventBus');

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
    delivery: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ emailState: 1, createdAt: 1 });
notificationSchema.post('save', doc => eventBus.emit('notification.created', doc.toObject()));
notificationSchema.post('insertMany', docs => docs.forEach(doc => eventBus.emit('notification.created', doc.toObject ? doc.toObject() : doc)));

module.exports = mongoose.model('Notification', notificationSchema);
