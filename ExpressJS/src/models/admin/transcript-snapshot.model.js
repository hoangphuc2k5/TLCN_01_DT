const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  version: { type: Number, required: true, min: 1 },
  contentHash: { type: String, required: true, minlength: 64, maxlength: 64 },
  transcript: { type: mongoose.Schema.Types.Mixed, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, versionKey: false });

schema.index({ studentId: 1, version: 1 }, { unique: true });
schema.index({ studentId: 1, contentHash: 1 }, { unique: true });
schema.index({ schoolId: 1, studentId: 1, createdAt: -1 });

module.exports = mongoose.model('TranscriptSnapshot', schema);
