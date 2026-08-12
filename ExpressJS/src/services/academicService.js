const ApiError = require('../utils/ApiError');
const {
  academicYearRepo,
  classRepo,
  subjectRepo,
  assignmentRepo,
  userRepo,
} = require('../repositories');
const { ROLES } = require('../constants/roles');
const User = require('../models/User');

const requireSchoolId = (actor, bodySchoolId) => {
  if (actor.role === ROLES.SUPER_ADMIN) {
    if (!bodySchoolId) throw new ApiError(400, 'Cần schoolId');
    return bodySchoolId;
  }
  return actor.schoolId;
};

// Academic years
const listAcademicYears = async (actor, query = {}) => {
  const schoolId = query.schoolId || actor.schoolId;
  if (!schoolId && actor.role === ROLES.SUPER_ADMIN) {
    return academicYearRepo.find({}, { limit: 100 });
  }
  return academicYearRepo.find({ schoolId });
};

const createAcademicYear = async (actor, data) => {
  const schoolId = requireSchoolId(actor, data.schoolId);
  if (data.isCurrent) {
    await require('../models/AcademicYear').updateMany({ schoolId }, { isCurrent: false });
  }
  return academicYearRepo.create({ ...data, schoolId });
};

// Classes
const listClasses = async (actor, query = {}) => {
  const filter = {};
  if (actor.role === ROLES.SUPER_ADMIN && query.schoolId) filter.schoolId = query.schoolId;
  else if (actor.schoolId) filter.schoolId = actor.schoolId;
  if (query.academicYearId) filter.academicYearId = query.academicYearId;
  return classRepo.find(filter, {
    populate: 'homeroomTeacherId academicYearId',
    limit: 200,
  });
};

const createClass = async (actor, data) => {
  const schoolId = requireSchoolId(actor, data.schoolId);
  if (!data.name || !data.academicYearId || data.gradeLevel == null) {
    throw new ApiError(400, 'Thiếu name/academicYearId/gradeLevel');
  }
  return classRepo.create({ ...data, schoolId });
};

const updateClass = async (actor, id, data) => {
  const cls = await classRepo.findById(id);
  if (!cls) throw new ApiError(404, 'Không tìm thấy lớp');
  if (actor.role !== ROLES.SUPER_ADMIN && String(cls.schoolId) !== String(actor.schoolId)) {
    throw new ApiError(403, 'Ngoài phạm vi');
  }
  const updated = await classRepo.updateById(id, data);
  if (data.homeroomTeacherId) {
    await User.findByIdAndUpdate(data.homeroomTeacherId, {
      role: ROLES.HOMEROOM_TEACHER,
      classId: id,
    });
  }
  return updated;
};

const deleteClass = async (actor, id) => {
  const cls = await classRepo.findById(id);
  if (!cls) throw new ApiError(404, 'Không tìm thấy lớp');
  if (actor.role !== ROLES.SUPER_ADMIN && String(cls.schoolId) !== String(actor.schoolId)) {
    throw new ApiError(403, 'Ngoài phạm vi');
  }
  await classRepo.deleteById(id);
  return true;
};

// Subjects
const listSubjects = async (actor, query = {}) => {
  const filter = {};
  if (actor.schoolId) filter.schoolId = actor.schoolId;
  if (query.schoolId && actor.role === ROLES.SUPER_ADMIN) filter.schoolId = query.schoolId;
  return subjectRepo.find(filter);
};

const createSubject = async (actor, data) => {
  const schoolId = requireSchoolId(actor, data.schoolId);
  if (!data.name || !data.code) throw new ApiError(400, 'Thiếu name/code');
  return subjectRepo.create({ ...data, schoolId });
};

const updateSubject = async (id, data) => {
  const subject = await subjectRepo.updateById(id, data);
  if (!subject) throw new ApiError(404, 'Không tìm thấy môn');
  return subject;
};

// Assignments
const listAssignments = async (actor, query = {}) => {
  const filter = {};
  if (actor.schoolId) filter.schoolId = actor.schoolId;
  if (query.teacherId) filter.teacherId = query.teacherId;
  if (query.classId) filter.classId = query.classId;
  if (
    [ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER].includes(actor.role) &&
    !query.teacherId
  ) {
    filter.teacherId = actor._id;
  }
  return assignmentRepo.find(filter, {
    populate: 'teacherId classId subjectId academicYearId',
  });
};

const createAssignment = async (actor, data) => {
  const schoolId = requireSchoolId(actor, data.schoolId);
  const { teacherId, classId, subjectId, academicYearId } = data;
  if (!teacherId || !classId || !subjectId || !academicYearId) {
    throw new ApiError(400, 'Thiếu thông tin phân công');
  }
  return assignmentRepo.create({
    schoolId,
    teacherId,
    classId,
    subjectId,
    academicYearId,
  });
};

const deleteAssignment = async (id) => {
  await assignmentRepo.deleteById(id);
  return true;
};

const listStudentsInClass = async (classId) => {
  return userRepo.find(
    { classId, role: ROLES.STUDENT },
    { select: '-password', sort: { name: 1 }, limit: 100 }
  );
};

module.exports = {
  listAcademicYears,
  createAcademicYear,
  listClasses,
  createClass,
  updateClass,
  deleteClass,
  listSubjects,
  createSubject,
  updateSubject,
  listAssignments,
  createAssignment,
  deleteAssignment,
  listStudentsInClass,
};
