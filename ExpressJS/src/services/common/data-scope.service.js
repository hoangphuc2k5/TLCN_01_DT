function createDataScopeService(dependencies) {
  const persistence = dependencies.persistence;
  const mongoose = require('mongoose');
  const ApiError = require("../../utils/common/api-error.util");
  const { ROLES } = require("../../config/constants/roles.config");
  
  const objectId = (value, name = 'id') => {
    const raw = value?._id || value;
    if (!mongoose.isObjectIdOrHexString(raw)) throw new ApiError(400, `${name} không hợp lệ`);
    return new mongoose.Types.ObjectId(String(raw));
  };
  
  const schoolScope = async (actor) => {
    if (!actor) throw new ApiError(401, 'Chưa xác thực');
    if (actor.role === ROLES.SUPER_ADMIN) return {};
    if (actor.role === ROLES.CLUSTER_ADMIN) {
      if (!actor.clusterId) throw new ApiError(403, 'Chưa được gán cụm');
      const schools = await persistence.schoolsFind({ clusterId: actor.clusterId });
      return { schoolId: { $in: schools.map(s => s._id) } };
    }
    if (!actor.schoolId) throw new ApiError(403, 'Chưa được gán trường');
    return { schoolId: objectId(actor.schoolId, 'schoolId') };
  };
  
  const personalStudentIds = async (actor) => {
    if (![ROLES.STUDENT, ROLES.PARENT].includes(actor.role)) return null;
    const users = await persistence.usersFind({
      ...await schoolScope(actor), role: ROLES.STUDENT,
      _id: { $in: actor.role === ROLES.STUDENT ? [actor._id] : actor.parentOf || [] },
    });
    return users.map(u => u._id);
  };
  
  const teacherClassScope = async (actor, resource) => {
    if (![ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER].includes(actor.role)) return {};
    const assignments = await persistence.assignmentsFind({ schoolId: actor.schoolId, teacherId: actor._id });
    const homeClasses = actor.role === ROLES.HOMEROOM_TEACHER
      ? await persistence.homeClassesFind({ schoolId: actor.schoolId, homeroomTeacherId: actor._id }) : [];
    const rules = [
      ...assignments.map(a => resource === 'grades'
        ? { classId: a.classId, subjectId: a.subjectId, academicYearId: a.academicYearId }
        : resource === 'exams' ? { classId: a.classId, subjectId: { $in: [a.subjectId, null] } }
          : { classId: a.classId }),
      // Exam access includes answer keys and grading; homeroom membership alone is insufficient.
      ...(resource === 'exams' ? [] : homeClasses).map(c => resource === 'grades'
        ? { classId: c._id, academicYearId: c.academicYearId } : { classId: c._id }),
    ];
    return rules.length ? { $or: rules } : { _id: { $in: [] } };
  };
  
  return { objectId, schoolScope, personalStudentIds, teacherClassScope };
  
}

class DataScopeService {
  constructor(dependencies) {
    Object.assign(this, createDataScopeService(dependencies));
  }
}

module.exports = DataScopeService;
