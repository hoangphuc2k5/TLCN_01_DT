const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'EquipmentAsset', required: true },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  issue: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: '', trim: true, maxlength: 2000 },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
  status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'], default: 'OPEN' },
  resolution: { type: String, default: '', maxlength: 2000 },
  cost: { type: Number, default: 0, min: 0 },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ schoolId: 1, status: 1, priority: 1 });
schema.index({ equipmentId: 1, createdAt: -1 });
module.exports = mongoose.model('EquipmentMaintenance', schema);
