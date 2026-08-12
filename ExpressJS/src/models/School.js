const mongoose = require('mongoose');
const { STATUS } = require('../constants/status');

const schoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    subdomain: { type: String, required: true, unique: true, lowercase: true, trim: true },
    clusterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cluster', default: null },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    logo: { type: String, default: '' },
    schoolType: {
      type: String,
      enum: ['PRESCHOOL', 'PRIMARY', 'SECONDARY', 'HIGH', 'MULTI'],
      default: 'MULTI',
    },
    status: { type: String, enum: Object.values(STATUS), default: STATUS.ACTIVE },
    appliedTemplateIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SharedTemplate' }],
  },
  { timestamps: true }
);

schoolSchema.index({ clusterId: 1 });

module.exports = mongoose.model('School', schoolSchema);
