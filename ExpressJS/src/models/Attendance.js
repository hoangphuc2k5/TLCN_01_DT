const mongoose = require('mongoose');
const { ATTENDANCE_STATUS } = require('../constants/status');

const attendanceRecordSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: Object.values(ATTENDANCE_STATUS),
      default: ATTENDANCE_STATUS.PRESENT,
    },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    period: { type: Number, default: 1 },
    records: [attendanceRecordSchema],
  },
  { timestamps: true }
);

attendanceSchema.index({ schoolId: 1, classId: 1, date: 1, period: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
