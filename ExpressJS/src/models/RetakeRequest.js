const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  reason: { type: String, required: true, maxlength: 2000 },
  status: { type: String, enum: ['REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED'], default: 'REQUESTED' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: Date,
  reviewNote: { type: String, default: '', maxlength: 2000 },
}, { timestamps: true });
schema.index({ studentId: 1, subjectId: 1, academicYearId: 1, status: 1 });
module.exports = mongoose.model('RetakeRequest', schema);
