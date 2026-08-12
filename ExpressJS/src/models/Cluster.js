const mongoose = require('mongoose');
const { STATUS } = require('../constants/status');

const clusterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    status: { type: String, enum: Object.values(STATUS), default: STATUS.ACTIVE },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cluster', clusterSchema);
