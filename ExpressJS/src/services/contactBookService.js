const ApiError = require('../utils/ApiError');
const ContactBookEntry = require('../models/ContactBookEntry');
const User = require('../models/User');
const { ROLES } = require('../constants/roles');
const { schoolScope, personalStudentIds, objectId, teacherClassScope } = require('./dataScope');
const { academicReferences, targetSchool } = require('./writeScope');

const managers = [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS];
const teachers = [ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER];
const populated = [
  { path: 'classId', select: 'name gradeLevel' },
  { path: 'studentId', select: 'name code classId' },
  { path: 'academicYearId', select: 'name startDate endDate' },
  { path: 'authorId', select: 'name code' },
];

const scope = async (actor, query = {}) => {
  const clauses = [await schoolScope(actor)];
  if (query.classId) clauses.push({ classId: objectId(query.classId, 'classId') });
  if (query.studentId) clauses.push({ studentId: objectId(query.studentId, 'studentId') });
  if (query.periodType) clauses.push({ periodType: query.periodType });
  if (query.periodKey) clauses.push({ periodKey: String(query.periodKey) });
  if ([ROLES.STUDENT, ROLES.PARENT].includes(actor.role)) {
    clauses.push({ studentId: { $in: await personalStudentIds(actor) }, status: 'PUBLISHED' });
  } else if (teachers.includes(actor.role)) {
    const teacherScope = await teacherClassScope(actor, 'contact_books');
    clauses.push(teacherScope);
  }
  return { $and: clauses };
};
const owner = (actor, row) => {
  const authorId = row.authorId?._id || row.authorId;
  if (managers.includes(actor.role) || String(authorId) === String(actor._id)) return;
  throw new ApiError(403, 'Khong co quyen thao tac so lien lac');
};
const list = async (actor, query) => ContactBookEntry.find(await scope(actor, query)).populate(populated).sort({ periodKey: -1, createdAt: -1 }).limit(500);
const get = async (actor, id) => {
  const row = await ContactBookEntry.findOne({ ...(await scope(actor)), _id: objectId(id) }).populate(populated);
  if (!row) throw new ApiError(404, 'Khong tim thay so lien lac');
  return row;
};
const validatePayload = async (actor, data, existing = {}) => {
  const schoolId = await targetSchool(actor, data.schoolId || existing.schoolId);
  const refs = await academicReferences(actor, { ...existing, ...data }, { homeroomAllowed: true, expectedSchoolId: schoolId });
  const studentId = objectId(data.studentId || existing.studentId, 'studentId');
  const student = await User.findOne({ _id: studentId, schoolId, classId: refs._id, role: ROLES.STUDENT });
  if (!student) throw new ApiError(403, 'Hoc sinh khong thuoc lop');
  const periodType = data.periodType || existing.periodType;
  const periodKey = String(data.periodKey || existing.periodKey || '').trim();
  if (!['WEEK', 'MONTH', 'TERM'].includes(periodType) || !periodKey) throw new ApiError(400, 'Ky lien lac khong hop le');
  return { schoolId, classId: refs._id, academicYearId: refs.academicYearId, studentId, periodType, periodKey };
};
const create = async (actor, data) => {
  if (![...managers, ...teachers].includes(actor.role)) throw new ApiError(403, 'Khong co quyen tao so lien lac');
  const refs = await validatePayload(actor, data);
  try {
    return await ContactBookEntry.create({ ...refs, authorId: actor._id, academicSummary: String(data.academicSummary || '').trim(), attendanceSummary: String(data.attendanceSummary || '').trim(), conductSummary: String(data.conductSummary || '').trim(), teacherNote: String(data.teacherNote || '').trim(), status: 'DRAFT' });
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, 'Ky lien lac da ton tai');
    throw error;
  }
};
const update = async (actor, id, data) => {
  const row = await get(actor, id); owner(actor, row);
  if (row.status !== 'DRAFT') throw new ApiError(409, 'Chi duoc sua ban nhap');
  const refs = await validatePayload(actor, data, row.toObject());
  Object.assign(row, refs, ...[]);
  for (const key of ['academicSummary', 'attendanceSummary', 'conductSummary', 'teacherNote']) if (data[key] !== undefined) row[key] = String(data[key] || '').trim();
  return row.save();
};
const publish = async (actor, id) => {
  const row = await get(actor, id); owner(actor, row);
  if (row.status !== 'DRAFT') throw new ApiError(409, 'So lien lac da duoc cong bo');
  row.status = 'PUBLISHED'; row.publishedAt = new Date(); return row.save();
};
const reply = async (actor, id, parentReply) => {
  if (actor.role !== ROLES.PARENT) throw new ApiError(403, 'Chi phu huynh duoc phan hoi');
  const row = await get(actor, id);
  if (typeof parentReply !== 'string' || !parentReply.trim()) throw new ApiError(400, 'Noi dung phan hoi khong hop le');
  row.parentReply = parentReply.trim(); return row.save();
};
module.exports = { list, get, create, update, publish, reply };
