const { schoolScope, personalStudentIds, teacherClassScope, objectId } = require('./dataScope');
const User = require('../models/User');

module.exports = async (actor, query = {}) => {
  const clauses = [await schoolScope(actor), await teacherClassScope(actor, 'timetable')];
  if (query.classId) clauses.push({ classId: objectId(query.classId, 'classId') });
  if (query.academicYearId) clauses.push({ academicYearId: objectId(query.academicYearId, 'academicYearId') });
  if (query.schoolId) clauses.push({ schoolId: objectId(query.schoolId, 'schoolId') });
  const ids = await personalStudentIds(actor);
  if (ids !== null) {
    const students = await User.find({ _id: { $in: ids } }).select('classId');
    clauses.push({ classId: { $in: students.map(s => s.classId).filter(Boolean) } });
  }
  return { $and: clauses };
};
