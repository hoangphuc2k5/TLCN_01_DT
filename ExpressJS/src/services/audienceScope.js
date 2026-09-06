const { ROLES } = require('../constants/roles');
const { personalStudentIds, teacherClassScope } = require('./dataScope');
const User = require('../models/User');

const audienceManagers = [ROLES.SUPER_ADMIN, ROLES.CLUSTER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS];

// Always intersect this with the document's tenant scope.
const classAudienceScope = async actor => {
  const personal = await personalStudentIds(actor);
  if (personal !== null) {
    const students = await User.find({ _id: { $in: personal } }).select('classId');
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

module.exports = { classAudienceScope, roleAudienceScope };
