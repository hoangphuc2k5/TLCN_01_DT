function createAudienceScopeService(dependencies) {
  const persistence = dependencies.persistence;
  const { ROLES } = require("../../../config/constants/roles.config");
  const { personalStudentIds, teacherClassScope } = dependencies.services["data-scope"];
  
  const audienceManagers = [ROLES.SUPER_ADMIN, ROLES.CLUSTER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS];
  
  // Always intersect this with the document's tenant scope.
  const classAudienceScope = async actor => {
    const personal = await personalStudentIds(actor);
    if (personal !== null) {
      const students = await persistence.studentsFind({ _id: { $in: personal } });
      return { $or: [{ classId: null }, { classId: { $in: students.map(s => s.classId).filter(Boolean) } }] };
    }
    if ([ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER].includes(actor.role)) {
      return { $or: [{ classId: null }, await teacherClassScope(actor, 'calendar')] };
    }
    return {};
  };
  
  const roleAudienceScope = actor => audienceManagers.includes(actor.role) ? {} : {
    $or: [{ targetRoles: { $exists: false } }, { targetRoles: { $size: 0 } }, { targetRoles: actor.role }, { createdBy: actor._id }],
  };
  
  return { classAudienceScope, roleAudienceScope };
  
}

class AudienceScopeService {
  constructor(dependencies) {
    Object.assign(this, createAudienceScopeService(dependencies));
  }
}

module.exports = AudienceScopeService;
