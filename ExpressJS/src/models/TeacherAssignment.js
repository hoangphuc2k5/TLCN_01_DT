const mongoose = require('mongoose');

const teacherAssignmentSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  },
  { timestamps: true }
);

teacherAssignmentSchema.index(
  { teacherId: 1, classId: 1, subjectId: 1, academicYearId: 1 },
  { unique: true }
);

module.exports = mongoose.model('TeacherAssignment', teacherAssignmentSchema);
