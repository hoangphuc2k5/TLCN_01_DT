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
const { schoolScope, personalStudentIds, objectId } = require('./dataScope');
const { targetSchool, reference, scopedDocument, pick, teaching } = require('./writeScope');

const requireSchoolId = targetSchool;
const classFields = ['name', 'gradeLevel', 'academicYearId', 'homeroomTeacherId', 'room', 'maxStudents', 'status'];
const classReferences = async (data, schoolId) => {
  await reference(academicYearRepo.model, data.academicYearId, schoolId);
  if (data.homeroomTeacherId) await reference(User, data.homeroomTeacherId, schoolId, { role: { $in: [ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER] } });
};

// Academic years
const listAcademicYears = async (actor, query = {}) => {
  const scope = await schoolScope(actor);
  return academicYearRepo.find({ $and: [scope, query.schoolId ? { schoolId: objectId(query.schoolId) } : {}] });
};

const createAcademicYear = async (actor, data) => {
  const schoolId = await requireSchoolId(actor, data.schoolId);
  const payload = pick(data, ['name', 'startDate', 'endDate', 'isCurrent', 'status']);
  await new academicYearRepo.model({ ...payload, schoolId }).validate();
  if (data.isCurrent) {
    await require('../models/AcademicYear').updateMany({ schoolId }, { isCurrent: false });
  }
  return academicYearRepo.create({ ...payload, schoolId });
};

// Classes
const listClasses = async (actor, query = {}) => {
  const filter = await schoolScope(actor);
  if (query.academicYearId) filter.academicYearId = query.academicYearId;
  const personal = await personalStudentIds(actor);
  if (personal !== null) {
    const students = await User.find({ _id: { $in: personal } }).select('classId');
    filter._id = { $in: students.map(s => s.classId).filter(Boolean) };
  } else if ([ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER].includes(actor.role)) {
    const assignments = await assignmentRepo.find({ schoolId: actor.schoolId, teacherId: actor._id }, { limit: 10000 });
    filter.$or = [{ _id: { $in: assignments.map(a => a.classId) } }, { homeroomTeacherId: actor._id }];
  }
  return classRepo.find(filter, {
    populate: 'homeroomTeacherId academicYearId',
    limit: 200,
  });
};

const createClass = async (actor, data) => {
  const schoolId = await requireSchoolId(actor, data.schoolId);
  if (!data.name || !data.academicYearId || data.gradeLevel == null) {
    throw new ApiError(400, 'Thiếu name/academicYearId/gradeLevel');
  }
  await classReferences(data, schoolId);
  return classRepo.create({ ...pick(data, classFields), schoolId });
};

const updateClass = async (actor, id, data) => {
  const cls = await scopedDocument(classRepo.model, actor, id);
  if (!cls) throw new ApiError(404, 'Không tìm thấy lớp');
  if (actor.role !== ROLES.SUPER_ADMIN && String(cls.schoolId) !== String(actor.schoolId)) {
    throw new ApiError(403, 'Ngoài phạm vi');
  }
  const payload = pick(data, classFields);
  await classReferences({ ...cls.toObject(), ...payload }, cls.schoolId);
  const updated = await classRepo.updateById(id, payload);
  return updated;
};

const deleteClass = async (actor, id) => {
  const cls = await scopedDocument(classRepo.model, actor, id);
  if (!cls) throw new ApiError(404, 'Không tìm thấy lớp');
  if (actor.role !== ROLES.SUPER_ADMIN && String(cls.schoolId) !== String(actor.schoolId)) {
    throw new ApiError(403, 'Ngoài phạm vi');
  }
  await classRepo.deleteById(id);
  return true;
};

// Subjects
const listSubjects = async (actor, query = {}) => {
  const filter = { $and: [await schoolScope(actor), query.schoolId ? { schoolId: objectId(query.schoolId) } : {}] };
  return subjectRepo.find(filter);
};

const createSubject = async (actor, data) => {
  const schoolId = await requireSchoolId(actor, data.schoolId);
  if (!data.name || !data.code) throw new ApiError(400, 'Thiếu name/code');
  return subjectRepo.create({ ...pick(data, ['name', 'code', 'gradeLevels', 'status']), schoolId });
};

const updateSubject = async (actor, id, data) => {
  await scopedDocument(subjectRepo.model, actor, id);
  const subject = await subjectRepo.updateById(id, pick(data, ['name', 'code', 'gradeLevels', 'status']));
  if (!subject) throw new ApiError(404, 'Không tìm thấy môn');
  return subject;
};

// Assignments
const listAssignments = async (actor, query = {}) => {
  const filter = await schoolScope(actor);
  if (query.teacherId) filter.teacherId = query.teacherId;
  if (query.classId) filter.classId = query.classId;
  if (
    [ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER].includes(actor.role)
  ) {
    filter.teacherId = actor._id;
  }
  return assignmentRepo.find(filter, {
    populate: 'teacherId classId subjectId academicYearId',
  });
};

const createAssignment = async (actor, data) => {
  const schoolId = await requireSchoolId(actor, data.schoolId);
  const { teacherId, classId, subjectId, academicYearId } = data;
  if (!teacherId || !classId || !subjectId || !academicYearId) {
    throw new ApiError(400, 'Thiếu thông tin phân công');
  }
  await reference(User, teacherId, schoolId, { role: { $in: [ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER] } });
  await reference(classRepo.model, classId, schoolId, { academicYearId: objectId(academicYearId) });
  await reference(subjectRepo.model, subjectId, schoolId);
  await reference(academicYearRepo.model, academicYearId, schoolId);
  return assignmentRepo.create({
    schoolId,
    teacherId,
    classId,
    subjectId,
    academicYearId,
  });
};

const deleteAssignment = async (actor, id) => {
  await scopedDocument(assignmentRepo.model, actor, id);
  await assignmentRepo.deleteById(id);
  return true;
};

const listStudentsInClass = async (actor, classId) => {
  const cls = await scopedDocument(classRepo.model, actor, classId);
  await teaching(actor, cls, null, true);
  const personal = await personalStudentIds(actor);
  return userRepo.find(
    { schoolId: cls.schoolId, classId, role: ROLES.STUDENT, ...(personal !== null ? { _id: { $in: personal } } : {}) },
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
