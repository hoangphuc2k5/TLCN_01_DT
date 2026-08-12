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
    makeupProposal: { type: String, default: '' },
  },
  { timestamps: true }
);

leaveRequestSchema.index({ schoolId: 1, status: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
