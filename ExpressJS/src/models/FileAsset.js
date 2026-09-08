const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  purpose: { type: String, enum: ['MATERIAL'], default: 'MATERIAL' },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  sizeBytes: { type: Number, required: true, min: 1 },
  sha256: { type: String, required: true },
  driver: { type: String, enum: ['local', 's3'], required: true },
  bucket: { type: String, default: '' },
  key: { type: String, required: true, unique: true },
  status: { type: String, enum: ['UPLOADING', 'READY', 'DELETING'], default: 'UPLOADING', index: true },
}, { timestamps: true });
module.exports = mongoose.model('FileAsset', schema);
