const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, default: '' },
    body: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    parentMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  },
  { timestamps: true }
);

messageSchema.index({ receiverId: 1, isRead: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
