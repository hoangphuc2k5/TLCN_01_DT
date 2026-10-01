const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherAppointment', required: true },
  respondentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
  comment: { type: String, default: '', trim: true, maxlength: 2000 },
}, { timestamps: true });

schema.index({ appointmentId: 1, respondentId: 1 }, { unique: true });
schema.index({ schoolId: 1, createdAt: -1 });

module.exports = mongoose.model('SatisfactionSurvey', schema);
