const mongoose = require('mongoose');

const sharedTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['TRANSCRIPT', 'GRADE_SHEET', 'CURRICULUM'],
      required: true,
    },
    scope: { type: String, enum: ['SYSTEM', 'CLUSTER'], default: 'SYSTEM' },
    clusterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cluster', default: null },
    content: { type: String, default: '' },
    version: { type: String, default: '1.0' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SharedTemplate', sharedTemplateSchema);
