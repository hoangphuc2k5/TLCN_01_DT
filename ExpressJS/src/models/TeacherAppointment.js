const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledAt: { type: Date, required: true },
  durationMinutes: { type: Number, min: 15, max: 120, default: 30 },
  mode: { type: String, enum: ['ONLINE', 'OFFLINE'], default: 'ONLINE' },
  meetingUrl: { type: String, default: '' },
  reason: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, enum: ['REQUESTED', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'COMPLETED'], default: 'REQUESTED' },
  responseNote: { type: String, default: '' },
  respondedAt: { type: Date, default: null },
}, { timestamps: true });

schema.index({ schoolId: 1, teacherId: 1, scheduledAt: 1, status: 1 });
schema.index({ schoolId: 1, parentId: 1, scheduledAt: -1 });

module.exports = mongoose.model('TeacherAppointment', schema);
