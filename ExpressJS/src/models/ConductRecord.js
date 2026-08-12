const mongoose = require('mongoose');

const conductRecordSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
    semester: { type: Number, enum: [1, 2], default: 1 },
    rating: {
      type: String,
      enum: ['TOT', 'KHA', 'TRUNG_BINH', 'YEU'],
      required: true,
    },
    comment: { type: String, default: '' },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

conductRecordSchema.index(
  { schoolId: 1, studentId: 1, academicYearId: 1, semester: 1 },
  { unique: true }
);

module.exports = mongoose.model('ConductRecord', conductRecordSchema);
