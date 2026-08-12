const mongoose = require('mongoose');
const { STATUS } = require('../constants/status');
const { ACTIONS } = require('../constants/permissionCatalog');

const rolePermissionSchema = new mongoose.Schema(
  {
    resource: { type: String, required: true, trim: true },
    actions: [{ type: String, enum: ACTIONS }],
  },
  { _id: false }
);

const roleSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    level: { type: Number, required: true, min: 0, default: 100 },
    isSystem: { type: Boolean, default: false },
    status: { type: String, enum: Object.values(STATUS), default: STATUS.ACTIVE },
    permissions: { type: [rolePermissionSchema], default: [] },
  },
  { timestamps: true }
);

roleSchema.index({ level: 1 });
roleSchema.index({ status: 1 });

module.exports = mongoose.model('Role', roleSchema);
