const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, default: '', maxlength: 4000 },
  capacity: { type: Number, min: 1, max: 10000, default: 50 },
  coordinatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN' },
}, { timestamps: true });
schema.index({ schoolId: 1, name: 1 }, { unique: true });
module.exports = mongoose.model('Club', schema);
