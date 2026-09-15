const mongoose = require('mongoose');

const materialDownloadSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningMaterial', required: true, index: true },
  fileAssetId: { type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['STARTED', 'COMPLETED', 'FAILED'], default: 'STARTED', index: true },
  sizeBytes: { type: Number, required: true, min: 1 },
  ip: { type: String, default: '', maxlength: 200 },
  userAgent: { type: String, default: '', maxlength: 500 },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

materialDownloadSchema.index({ materialId: 1, createdAt: -1 });
materialDownloadSchema.index({ schoolId: 1, userId: 1, createdAt: -1 });

module.exports = mongoose.model('MaterialDownload', materialDownloadSchema);
