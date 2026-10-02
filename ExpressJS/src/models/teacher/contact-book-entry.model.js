const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  periodType: { type: String, enum: ['WEEK', 'MONTH', 'TERM'], required: true },
  periodKey: { type: String, required: true, trim: true, maxlength: 30 },
  academicSummary: { type: String, default: '', maxlength: 5000 },
  attendanceSummary: { type: String, default: '', maxlength: 2000 },
  conductSummary: { type: String, default: '', maxlength: 2000 },
  teacherNote: { type: String, default: '', maxlength: 5000 },
  parentReply: { type: String, default: '', maxlength: 3000 },
  status: { type: String, enum: ['DRAFT', 'PUBLISHED'], default: 'DRAFT' },
  publishedAt: Date,
}, { timestamps: true });

schema.index({ studentId: 1, academicYearId: 1, periodType: 1, periodKey: 1 }, { unique: true });
schema.index({ schoolId: 1, classId: 1, status: 1, createdAt: -1 });
module.exports = mongoose.model('ContactBookEntry', schema);
