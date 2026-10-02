const mongoose = require('mongoose');
const STATUSES = ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'SKIPPED'];
const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
  kind: { type: String, enum: ['NOTIFICATION_EMAIL', 'FILE_DELETE'], required: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  label: { type: String, default: '', maxlength: 180 },
  status: { type: String, enum: STATUSES, default: 'QUEUED' },
  runAt: { type: Date, default: Date.now },
  attempts: { type: Number, default: 0 },
  totalAttempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, required: true, min: 1, max: 20 },
  lockToken: { type: String, default: null, select: false },
  lockedUntil: { type: Date, default: null },
  startedAt: { type: Date, default: null },
  finishedAt: { type: Date, default: null },
  lastError: { type: String, default: '' },
  outcome: { type: String, default: '' },
}, { timestamps: true });
schema.index({ schoolId: 1, kind: 1, resourceId: 1 }, { unique: true });
schema.index({ status: 1, runAt: 1 });
schema.index({ status: 1, lockedUntil: 1 });
schema.index({ schoolId: 1, createdAt: -1 });
module.exports = mongoose.model('Job', schema);
module.exports.STATUSES = STATUSES;
