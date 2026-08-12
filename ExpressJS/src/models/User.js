const mongoose = require('mongoose');
const { ROLES } = require('../constants/roles');
const { STATUS } = require('../constants/status');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, default: null },
    googleId: { type: String, default: null, index: true },
    authProvider: { type: String, enum: ['password', 'google', 'both'], default: 'password' },
    role: { type: String, required: true, uppercase: true, trim: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
    clusterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cluster', default: null },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '' },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Other' },
    status: { type: String, enum: Object.values(STATUS), default: STATUS.ACTIVE },
    parentOf: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    code: { type: String, default: '' },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
  },
  { timestamps: true }
);

userSchema.index({ schoolId: 1, role: 1 });
userSchema.index({ clusterId: 1 });

userSchema.methods.toSafeObject = function toSafeObject() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

userSchema.statics.isGlobalRole = function isGlobalRole(role) {
  return role === ROLES.SUPER_ADMIN;
};

module.exports = mongoose.model('User', userSchema);
