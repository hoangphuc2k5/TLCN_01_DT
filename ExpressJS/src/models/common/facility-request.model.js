const mongoose = require('mongoose');

const facilityRequestSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    itemType: { type: String, enum: ['ROOM', 'EQUIPMENT'], default: 'ROOM' },
    itemName: { type: String, required: true },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'RETURNED'],
      default: 'PENDING',
    },
    note: { type: String, default: '' },
    reviewNote: { type: String, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    returnedAt: { type: Date, default: null },
    conditionOnReturn: { type: String, default: '' },
  },
  { timestamps: true }
);

facilityRequestSchema.index({ schoolId: 1, status: 1 });

module.exports = mongoose.model('FacilityRequest', facilityRequestSchema);
