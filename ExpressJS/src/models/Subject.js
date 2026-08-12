const mongoose = require('mongoose');
const { STATUS } = require('../constants/status');

const subjectSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    gradeLevels: [{ type: Number }],
    status: { type: String, enum: Object.values(STATUS), default: STATUS.ACTIVE },
  },
  { timestamps: true }
);

subjectSchema.index({ schoolId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
