const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    resourceId: { type: String, default: '' },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '' },
  },
  { timestamps: true }
);

auditLogSchema.index({ schoolId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
