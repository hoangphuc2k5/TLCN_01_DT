const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 1, max: 7 },
    period: { type: Number, required: true, min: 1, max: 10 },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    room: { type: String, default: '' },
  },
  { _id: false }
);

const timetableSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    slots: [slotSchema],
    status: { type: String, enum: ['DRAFT', 'APPROVED'], default: 'DRAFT' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

timetableSchema.index({ schoolId: 1, classId: 1, academicYearId: 1 }, { unique: true });

module.exports = mongoose.model('Timetable', timetableSchema);
