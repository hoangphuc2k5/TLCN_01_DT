const mongoose = require('mongoose');
const { STATUS } = require('../constants/status');

const classSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    name: { type: String, required: true, trim: true },
    gradeLevel: { type: Number, required: true },
    homeroomTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    room: { type: String, default: '' },
    maxStudents: { type: Number, default: 45 },
    status: { type: String, enum: Object.values(STATUS), default: STATUS.ACTIVE },
  },
  { timestamps: true }
);

classSchema.index({ schoolId: 1, academicYearId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Class', classSchema);
