const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  documentType: { type: String, enum: ['IDENTITY', 'BIRTH_CERTIFICATE', 'TRANSCRIPT', 'HEALTH', 'OTHER'], required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  fileAssetId: { type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset', required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

schema.index({ schoolId: 1, studentId: 1, documentType: 1 });
schema.index({ fileAssetId: 1 }, { unique: true });

module.exports = mongoose.model('StudentDocument', schema);
