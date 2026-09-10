const mongoose = require('mongoose');
const { LEAVE_STATUS, LEAVE_TYPES } = require('../constants/status');

const leaveRequestSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    type: { type: String, enum: Object.values(LEAVE_TYPES), required: true },
    reason: { type: String, required: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    status: { type: String, enum: Object.values(LEAVE_STATUS), default: LEAVE_STATUS.PENDING },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewNote: { type: String, default: '' },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancelledAt: Date,
    cancellationNote: { type: String, default: '' },
    makeupProposal: { type: String, default: '' },
    makeup: {
      type: new mongoose.Schema({
        absenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveRequest', required: true },
        timetableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Timetable', required: true },
        classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
        academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
        subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
        teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        originalDate: { type: String, required: true },
        originalPeriod: { type: Number, required: true },
        date: { type: String, required: true },
        period: { type: Number, required: true },
        room: { type: String, default: '' },
      }, { _id: false }),
      default: undefined,
    },
  },
  { timestamps: true }
);

leaveRequestSchema.index({ schoolId: 1, status: 1 });
leaveRequestSchema.index({ schoolId: 1, type: 1, status: 1, fromDate: 1, toDate: 1 });
leaveRequestSchema.index({ schoolId: 1, 'makeup.date': 1, status: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
