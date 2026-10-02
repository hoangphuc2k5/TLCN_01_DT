const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: ['EVENT', 'EXAM', 'HOLIDAY', 'MAKEUP', 'MEETING', 'OTHER'],
      default: 'EVENT',
    },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetRoles: [{ type: String }],
  },
  { timestamps: true }
);

calendarEventSchema.index({ schoolId: 1, startAt: 1 });

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
