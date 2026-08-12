const mongoose = require('mongoose');
const { STATUS } = require('../constants/status');

const academicYearSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isCurrent: { type: Boolean, default: false },
    status: { type: String, enum: Object.values(STATUS), default: STATUS.ACTIVE },
  },
  { timestamps: true }
);

academicYearSchema.index({ schoolId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('AcademicYear', academicYearSchema);
