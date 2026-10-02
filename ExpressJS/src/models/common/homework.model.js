const mongoose = require('mongoose');

const homeworkSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  instructions: { type: String, default: '', maxlength: 10000 },
  availableFrom: { type: Date, default: Date.now },
  dueAt: { type: Date, required: true },
  lateUntil: { type: Date, default: null },
  allowLate: { type: Boolean, default: false },
  maxScore: { type: Number, min: 0, max: 100, default: 10 },
  status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'CLOSED'], default: 'DRAFT' },
}, { timestamps: true });

homeworkSchema.index({ schoolId: 1, classId: 1, status: 1, dueAt: -1 });
homeworkSchema.index({ schoolId: 1, teacherId: 1, createdAt: -1 });

module.exports = mongoose.model('Homework', homeworkSchema);
