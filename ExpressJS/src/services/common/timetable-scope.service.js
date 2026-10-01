function createTimetableScopeService(dependencies) {
  const persistence = dependencies.persistence;
  const { schoolScope, personalStudentIds, teacherClassScope, objectId } = dependencies.services["data-scope"];
  
  const execute = async (actor, query = {}) => {
    const clauses = [await schoolScope(actor), await teacherClassScope(actor, 'timetable')];
    if (query.classId) clauses.push({ classId: objectId(query.classId, 'classId') });
    if (query.academicYearId) clauses.push({ academicYearId: objectId(query.academicYearId, 'academicYearId') });
    if (query.schoolId) clauses.push({ schoolId: objectId(query.schoolId, 'schoolId') });
    const ids = await personalStudentIds(actor);
    if (ids !== null) {
      const students = await persistence.studentsFind({ _id: { $in: ids } });
      clauses.push({ classId: { $in: students.map(s => s.classId).filter(Boolean) } });
    }
    return { $and: clauses };
  };
  return { execute };
  
}

class TimetableScopeService {
  constructor(dependencies) {
    Object.assign(this, createTimetableScopeService(dependencies));
  }
}

module.exports = TimetableScopeService;
