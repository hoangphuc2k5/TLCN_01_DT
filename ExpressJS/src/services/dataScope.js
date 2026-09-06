const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const School = require('../models/School');
const User = require('../models/User');
const Class = require('../models/Class');
const TeacherAssignment = require('../models/TeacherAssignment');
const { ROLES } = require('../constants/roles');

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
    const schools = await School.find({ clusterId: actor.clusterId }).select('_id');
    return { schoolId: { $in: schools.map(s => s._id) } };
  }
  if (!actor.schoolId) throw new ApiError(403, 'Chưa được gán trường');
  return { schoolId: objectId(actor.schoolId, 'schoolId') };
};

const personalStudentIds = async (actor) => {
  if (![ROLES.STUDENT, ROLES.PARENT].includes(actor.role)) return null;
  const users = await User.find({
    ...await schoolScope(actor), role: ROLES.STUDENT,
    _id: { $in: actor.role === ROLES.STUDENT ? [actor._id] : actor.parentOf || [] },
  }).select('_id');
  return users.map(u => u._id);
};

const teacherClassScope = async (actor, resource) => {
  if (![ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER].includes(actor.role)) return {};
  const assignments = await TeacherAssignment.find({ schoolId: actor.schoolId, teacherId: actor._id }).lean();
  const homeClasses = actor.role === ROLES.HOMEROOM_TEACHER
    ? await Class.find({ schoolId: actor.schoolId, homeroomTeacherId: actor._id }).lean() : [];
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

module.exports = { objectId, schoolScope, personalStudentIds, teacherClassScope };
