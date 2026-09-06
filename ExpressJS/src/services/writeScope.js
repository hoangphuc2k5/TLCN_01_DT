const ApiError = require('../utils/ApiError');
const { objectId, schoolScope } = require('./dataScope');
const School = require('../models/School');
const Class = require('../models/Class');
const User = require('../models/User');
const Subject = require('../models/Subject');
const AcademicYear = require('../models/AcademicYear');
const Assignment = require('../models/TeacherAssignment');
const { ROLES } = require('../constants/roles');

const pick = (data, keys) => Object.fromEntries(keys.filter(k => data[k] !== undefined).map(k => [k, data[k]]));
const scopedDocument = async (Model, actor, id) => {
  const doc = await Model.findOne({ ...await schoolScope(actor), _id: objectId(id) });
  if (!doc) throw new ApiError(404, 'Không tìm thấy dữ liệu trong phạm vi');
  return doc;
};
const reference = async (Model, id, schoolId, extra = {}) => {
  const doc = await Model.findOne({ _id: objectId(id), schoolId, ...extra });
  if (!doc) throw new ApiError(403, 'Dữ liệu tham chiếu không thuộc trường hoặc không đúng quan hệ');
  return doc;
};
const targetSchool = async (actor, requested) => {
  const id = objectId(requested || actor.schoolId, 'schoolId');
  const scope = await schoolScope(actor);
  const allowed = actor.role === ROLES.SUPER_ADMIN || (actor.role === ROLES.CLUSTER_ADMIN
    ? scope.schoolId.$in.some(s => String(s) === String(id)) : String(actor.schoolId) === String(id));
  if (!allowed || !(await School.exists({ _id: id }))) throw new ApiError(403, 'Trường ngoài phạm vi');
  return id;
};
const teaching = async (actor, cls, subjectId, homeroomAllowed = false) => {
  if (![ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER].includes(actor.role)) return;
  if (homeroomAllowed && String(cls.homeroomTeacherId) === String(actor._id)) return;
  if (!(await Assignment.exists({ schoolId: cls.schoolId, classId: cls._id, academicYearId: cls.academicYearId,
    teacherId: actor._id, ...(subjectId ? { subjectId } : {}),
  }))) throw new ApiError(403, 'Không được phân công lớp/môn này');
};
const academicReferences = async (actor, data, { homeroomAllowed = false } = {}) => {
  const cls = await scopedDocument(Class, actor, data.classId);
  if (data.academicYearId && String(cls.academicYearId) !== String(objectId(data.academicYearId))) throw new ApiError(403, 'Lớp không thuộc năm học');
  await reference(AcademicYear, cls.academicYearId, cls.schoolId);
  if (data.subjectId) await reference(Subject, data.subjectId, cls.schoolId);
  if (data.studentId) await reference(User, data.studentId, cls.schoolId, { classId: cls._id, role: ROLES.STUDENT });
  await teaching(actor, cls, data.subjectId, homeroomAllowed);
  return cls;
};
module.exports = { pick, scopedDocument, reference, targetSchool, academicReferences, teaching };
