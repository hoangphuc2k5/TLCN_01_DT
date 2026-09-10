const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ParentMeeting', required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['GOING', 'MAYBE', 'DECLINED'], required: true },
  note: { type: String, default: '', maxlength: 1000 },
}, { timestamps: true });
schema.index({ meetingId: 1, parentId: 1 }, { unique: true });
module.exports = mongoose.model('ParentMeetingResponse', schema);
