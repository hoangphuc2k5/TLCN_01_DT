const mongoose = require('mongoose');
const ref = name => ({ type: mongoose.Schema.Types.ObjectId, ref: name, required: true });
const schema = new mongoose.Schema({
  studentId: ref('User'),
  studentName: { type: String, required: true },
  fromSchoolId: ref('School'),
  toSchoolId: ref('School'),
  fromClassId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
  toClassId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
  gradeLevel: { type: Number, required: true },
  reason: { type: String, required: true, maxlength: 1000 },
  requestedDate: { type: Date, required: true },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'ACCEPTED', 'REJECTED', 'CANCELLED'], default: 'PENDING' },
  // Unique partial index prevents concurrent open requests for the same student.
  open: { type: Boolean, default: true },
  createdBy: ref('User'),
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  completedAt: Date,
  // Only academic information selected by the server; never credentials or finance records.
  handover: { type: mongoose.Schema.Types.Mixed, default: null },
  history: [{ action: String, actorId: ref('User'), at: Date, note: String }],
}, { timestamps: true });
schema.index({ studentId: 1 }, { unique: true, partialFilterExpression: { open: true } });
schema.index({ fromSchoolId: 1, createdAt: -1 });
schema.index({ toSchoolId: 1, status: 1, createdAt: -1 });
module.exports = mongoose.model('SchoolTransfer', schema);
