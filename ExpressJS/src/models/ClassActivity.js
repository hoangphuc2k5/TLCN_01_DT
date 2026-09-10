const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  scheduledAt: { type: Date, required: true },
  agenda: { type: String, default: '', maxlength: 5000 },
  minutes: { type: String, default: '', maxlength: 10000 },
  status: { type: String, enum: ['DRAFT', 'PUBLISHED'], default: 'DRAFT' },
  publishedAt: Date,
}, { timestamps: true });
schema.index({ schoolId: 1, classId: 1, scheduledAt: -1 });
module.exports = mongoose.model('ClassActivity', schema);
