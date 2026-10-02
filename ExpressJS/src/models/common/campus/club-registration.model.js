const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['REGISTERED', 'CANCELLED'], default: 'REGISTERED' },
}, { timestamps: true });
schema.index({ clubId: 1, studentId: 1 }, { unique: true });
module.exports = mongoose.model('ClubRegistration', schema);
