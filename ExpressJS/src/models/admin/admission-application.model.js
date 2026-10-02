const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  trackingCode: { type: String, required: true, uppercase: true, trim: true },
  applicantName: { type: String, required: true, trim: true, maxlength: 200 },
  dateOfBirth: { type: Date, required: true },
  guardianName: { type: String, required: true, trim: true, maxlength: 200 },
  guardianPhone: { type: String, required: true, trim: true, maxlength: 30 },
  guardianEmail: { type: String, default: '', trim: true, lowercase: true, maxlength: 200 },
  requestedGrade: { type: Number, required: true, min: 1, max: 12 },
  previousSchool: { type: String, default: '', trim: true, maxlength: 300 },
  note: { type: String, default: '', trim: true, maxlength: 2000 },
  status: { type: String, enum: ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WAITLISTED'], default: 'SUBMITTED' },
  reviewNote: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
}, { timestamps: true });

schema.index({ trackingCode: 1 }, { unique: true });
schema.index({ schoolId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('AdmissionApplication', schema);
