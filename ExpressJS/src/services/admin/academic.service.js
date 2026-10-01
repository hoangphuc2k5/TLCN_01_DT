function createAcademicService(dependencies) {
  const persistence = dependencies.persistence;
  const ApiError = require("../../utils/common/api-error.util");
  const {
    academicYearRepo,
    classRepo,
    subjectRepo,
    assignmentRepo,
    userRepo,
  } = dependencies.repositories["shared"];
  const { ROLES } = require("../../config/constants/roles.config");
  const User = "user";
  const { schoolScope, personalStudentIds, objectId } = dependencies.services["data-scope"];
  const { targetSchool, reference, scopedDocument, pick, teaching } = dependencies.services["write-scope"];
  
  const requireSchoolId = targetSchool;
  const classFields = ['name', 'gradeLevel', 'academicYearId', 'homeroomTeacherId', 'room', 'maxStudents', 'status'];
  const classReferences = async (data, schoolId) => {
    await reference("academic-year", data.academicYearId, schoolId);
    if (data.homeroomTeacherId) await reference(User, data.homeroomTeacherId, schoolId, { role: { $in: [ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER] } });
  };
  
  // Academic years
  const listAcademicYears = async (actor, query = {}) => {
    const scope = await schoolScope(actor);
    return persistence.listAcademicYearsFind({ $and: [scope, query.schoolId ? { schoolId: objectId(query.schoolId) } : {}] });
  };
  
  const createAcademicYear = async (actor, data) => {
    const schoolId = await requireSchoolId(actor, data.schoolId);
    const payload = pick(data, ['name', 'startDate', 'endDate', 'isCurrent', 'status']);
    await persistence.createAcademicYearNewDocument({ ...payload, schoolId });
    if (data.isCurrent) {
      await persistence.createAcademicYearUpdateMany({ schoolId }, { isCurrent: false });
    }
    return persistence.createAcademicYearCreate({ ...payload, schoolId });
  };
  
  // Classes
  const listClasses = async (actor, query = {}) => {
    const filter = await schoolScope(actor);
    if (query.academicYearId) filter.academicYearId = query.academicYearId;
    const personal = await personalStudentIds(actor);
    if (personal !== null) {
      const students = await persistence.studentsFind({ _id: { $in: personal } });
      filter._id = { $in: students.map(s => s.classId).filter(Boolean) };
    } else if ([ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER].includes(actor.role)) {
      const assignments = await persistence.assignmentsFind({ schoolId: actor.schoolId, teacherId: actor._id }, { limit: 10000 });
      filter.$or = [{ _id: { $in: assignments.map(a => a.classId) } }, { homeroomTeacherId: actor._id }];
    }
    return persistence.listClassesFind(filter, {
      populate: [{ path: 'homeroomTeacherId', select: 'name code email' }, { path: 'academicYearId' }],
      limit: 200,
    });
  };
  
  const createClass = async (actor, data) => {
    const schoolId = await requireSchoolId(actor, data.schoolId);
    if (!data.name || !data.academicYearId || data.gradeLevel == null) {
      throw new ApiError(400, 'Thiếu name/academicYearId/gradeLevel');
    }
    await classReferences(data, schoolId);
    return persistence.createClassCreate({ ...pick(data, classFields), schoolId });
  };
  
  const updateClass = async (actor, id, data) => {
    const cls = await scopedDocument("class", actor, id);
    if (!cls) throw new ApiError(404, 'Không tìm thấy lớp');
    if (actor.role !== ROLES.SUPER_ADMIN && String(cls.schoolId) !== String(actor.schoolId)) {
      throw new ApiError(403, 'Ngoài phạm vi');
    }
    const payload = pick(data, classFields);
    await classReferences({ ...cls.toObject(), ...payload }, cls.schoolId);
    const updated = await persistence.updatedUpdateById(id, payload);
    return updated;
  };
  
  const deleteClass = async (actor, id) => {
    const cls = await scopedDocument("class", actor, id);
    if (!cls) throw new ApiError(404, 'Không tìm thấy lớp');
    if (actor.role !== ROLES.SUPER_ADMIN && String(cls.schoolId) !== String(actor.schoolId)) {
      throw new ApiError(403, 'Ngoài phạm vi');
    }
    await persistence.deleteClassDeleteById(id);
    return true;
  };
  
  // Subjects
  const listSubjects = async (actor, query = {}) => {
    const filter = { $and: [await schoolScope(actor), query.schoolId ? { schoolId: objectId(query.schoolId) } : {}] };
    return persistence.listSubjectsFind(filter);
  };
  
  const createSubject = async (actor, data) => {
    const schoolId = await requireSchoolId(actor, data.schoolId);
    if (!data.name || !data.code) throw new ApiError(400, 'Thiếu name/code');
    return persistence.createSubjectCreate({ ...pick(data, ['name', 'code', 'gradeLevels', 'status']), schoolId });
  };
  
  const updateSubject = async (actor, id, data) => {
    await scopedDocument("subject", actor, id);
    const subject = await persistence.subjectUpdateById(id, pick(data, ['name', 'code', 'gradeLevels', 'status']));
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
    return persistence.listAssignmentsFind(filter, {
      populate: [{ path: 'teacherId', select: 'name code email' }, { path: 'classId' }, { path: 'subjectId' }, { path: 'academicYearId' }],
    });
  };
  
  const createAssignment = async (actor, data) => {
    const schoolId = await requireSchoolId(actor, data.schoolId);
    const { teacherId, classId, subjectId, academicYearId } = data;
    if (!teacherId || !classId || !subjectId || !academicYearId) {
      throw new ApiError(400, 'Thiếu thông tin phân công');
    }
    await reference(User, teacherId, schoolId, { role: { $in: [ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER] } });
    await reference("class", classId, schoolId, { academicYearId: objectId(academicYearId) });
    await reference("subject", subjectId, schoolId);
    await reference("academic-year", academicYearId, schoolId);
    return persistence.createAssignmentCreate({
      schoolId,
      teacherId,
      classId,
      subjectId,
      academicYearId,
    });
  };
  
  const deleteAssignment = async (actor, id) => {
    await scopedDocument("teacher-assignment", actor, id);
    await persistence.deleteAssignmentDeleteById(id);
    return true;
  };
  
  const listStudentsInClass = async (actor, classId) => {
    const cls = await scopedDocument("class", actor, classId);
    await teaching(actor, cls, null, true);
    const personal = await personalStudentIds(actor);
    return persistence.listStudentsInClassFind({ schoolId: cls.schoolId, classId, role: ROLES.STUDENT, ...(personal !== null ? { _id: { $in: personal } } : {}) }, { select: 'name code classId schoolId role', sort: { name: 1 }, limit: 100 });
  };
  
  return {
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
  
}

class AcademicService {
  constructor(dependencies) {
    Object.assign(this, createAcademicService(dependencies));
  }
}

module.exports = AcademicService;
