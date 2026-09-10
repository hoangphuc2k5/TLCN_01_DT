const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true, maxlength: 200 },
  category: { type: String, default: 'GENERAL', trim: true, maxlength: 100 },
  serialNumber: { type: String, default: '', trim: true, maxlength: 120 },
  location: { type: String, default: '', trim: true, maxlength: 200 },
  quantity: { type: Number, default: 1, min: 1, max: 100000 },
  purchaseDate: { type: Date, default: null },
  warrantyUntil: { type: Date, default: null },
  status: { type: String, enum: ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED'], default: 'AVAILABLE' },
  note: { type: String, default: '', maxlength: 1000 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
schema.index({ schoolId: 1, code: 1 }, { unique: true });
schema.index({ schoolId: 1, status: 1, category: 1 });
module.exports = mongoose.model('EquipmentAsset', schema);
