const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'SharedTemplate', required: true },
  name: { type: String, required: true }, type: { type: String, required: true },
  version: { type: String, default: '1.0' }, content: { type: String, default: '' },
  syncedAt: { type: Date, default: Date.now }, sourceUpdatedAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ schoolId: 1, templateId: 1 }, { unique: true });
module.exports = mongoose.model('TemplateDeployment', schema);
