const mongoose = require('mongoose');
const { GRADE_TYPES } = require('../constants/status');

const scoreItemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: Object.values(GRADE_TYPES), required: true },
    score: { type: Number, required: true, min: 0, max: 10 },
    weight: { type: Number, default: 1 },
    note: { type: String, default: '' },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const gradeSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    semester: { type: Number, enum: [1, 2], default: 1 },
    scores: [scoreItemSchema],
    average: { type: Number, default: null },
    classification: { type: String, default: null },
  },
  { timestamps: true }
);

gradeSchema.index(
  { schoolId: 1, studentId: 1, subjectId: 1, academicYearId: 1, semester: 1 },
  { unique: true }
);

module.exports = mongoose.model('Grade', gradeSchema);
