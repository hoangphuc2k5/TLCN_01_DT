function createWriteScopeService(dependencies) {
  const persistence = dependencies.persistence;
  const ApiError = require("../../utils/common/api-error.util");
  const { objectId, schoolScope } = dependencies.services["data-scope"];
  const Class = "class";
  const User = "user";
  const Subject = "subject";
  const AcademicYear = "academic-year";
  const { ROLES } = require("../../config/constants/roles.config");
  
  const pick = (data, keys) => Object.fromEntries(keys.filter(k => data[k] !== undefined).map(k => [k, data[k]]));
  const scopedDocument = async (model, actor, id) => {
    const doc = await persistence.findOne(model, { ...await schoolScope(actor), _id: objectId(id) });
    if (!doc) throw new ApiError(404, 'Không tìm thấy dữ liệu trong phạm vi');
    return doc;
  };
  const reference = async (model, id, schoolId, extra = {}) => {
    const doc = await persistence.findOne(model, { _id: objectId(id), schoolId, ...extra });
    if (!doc) throw new ApiError(403, 'Dữ liệu tham chiếu không thuộc trường hoặc không đúng quan hệ');
    return doc;
  };
  const targetSchool = async (actor, requested) => {
    const id = objectId(requested || actor.schoolId, 'schoolId');
    const scope = await schoolScope(actor);
    const allowed = actor.role === ROLES.SUPER_ADMIN || (actor.role === ROLES.CLUSTER_ADMIN
      ? scope.schoolId.$in.some(s => String(s) === String(id)) : String(actor.schoolId) === String(id));
    if (!allowed || !(await persistence.targetSchoolExists({ _id: id }))) throw new ApiError(403, 'Trường ngoài phạm vi');
    return id;
  };
  const teaching = async (actor, cls, subjectId, homeroomAllowed = false) => {
    if (![ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER].includes(actor.role)) return;
    if (homeroomAllowed && String(cls.homeroomTeacherId) === String(actor._id)) return;
    if (!(await persistence.teachingExists({ schoolId: cls.schoolId, classId: cls._id, academicYearId: cls.academicYearId,
      teacherId: actor._id, ...(subjectId ? { subjectId } : {}),
    }))) throw new ApiError(403, 'Không được phân công lớp/môn này');
  };
  const academicReferences = async (actor, data, { homeroomAllowed = false, expectedSchoolId, historicalStudent = false } = {}) => {
    const cls = await scopedDocument(Class, actor, data.classId);
    if (expectedSchoolId && String(cls.schoolId) !== String(expectedSchoolId)) throw new ApiError(403, 'Lớp không thuộc trường được chọn');
    if (data.academicYearId && String(cls.academicYearId) !== String(objectId(data.academicYearId))) throw new ApiError(403, 'Lớp không thuộc năm học');
    await reference(AcademicYear, cls.academicYearId, cls.schoolId);
    if (data.subjectId) await reference(Subject, data.subjectId, cls.schoolId);
    if (data.studentId) await reference(User, data.studentId, cls.schoolId, {
      role: ROLES.STUDENT,
      ...(historicalStudent ? { $or: [{ classId: cls._id }, { 'classHistory.fromClassId': cls._id }, { 'classHistory.toClassId': cls._id }] } : { classId: cls._id }),
    });
    await teaching(actor, cls, data.subjectId, homeroomAllowed);
    return cls;
  };
  return { pick, scopedDocument, reference, targetSchool, academicReferences, teaching };
  
}

class WriteScopeService {
  constructor(dependencies) {
    Object.assign(this, createWriteScopeService(dependencies));
  }
}

module.exports = WriteScopeService;
