const ApiError = require('../utils/ApiError');
const cache = require('./rolePermissionCache');
const { ROLES } = require('../constants/roles');
const { objectId, schoolScope, personalStudentIds, teacherClassScope } = require('./dataScope');

const buildExportScope = async (actor, resource, query = {}) => {
  if (!actor) throw new ApiError(401, 'Chưa xác thực');
  const personal = [ROLES.STUDENT, ROLES.PARENT].includes(actor.role);
  const teacher = [ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER].includes(actor.role);
  const resources = personal ? ['own_data'] : teacher ? [resource] : [resource, 'reports'];
  const allowed = await Promise.all(resources.map(r => cache.canAccess(actor.role, r, 'view')));
  if (!allowed.some(Boolean)) throw new ApiError(403, 'Không có quyền xem dữ liệu báo cáo');
  const filters = [await schoolScope(actor)];
  let studentIds = await personalStudentIds(actor);
  if (teacher) filters.push(await teacherClassScope(actor, resource));
  const supported = resource === 'grades'
    ? ['schoolId', 'classId', 'subjectId', 'academicYearId']
    : resource === 'fees' ? ['schoolId', 'academicYearId'] : ['schoolId', 'classId', 'subjectId'];
  for (const key of ['schoolId', 'classId', 'subjectId', 'academicYearId']) {
    if (query[key] === undefined) continue;
    if (!supported.includes(key)) throw new ApiError(400, `${key} không được hỗ trợ cho báo cáo này`);
    filters.push({ [key]: objectId(query[key], key) });
  }
  if (query.studentId !== undefined) {
    const id = objectId(query.studentId, 'studentId');
    studentIds = studentIds === null ? [id] : studentIds.filter(s => String(s) === String(id));
  }
  if (query.semester !== undefined) {
    if (resource !== 'grades' || !['1', '2'].includes(String(query.semester))) throw new ApiError(400, 'Học kỳ không hợp lệ');
    filters.push({ semester: Number(query.semester) });
  }
  if (studentIds !== null) filters.push({ [resource === 'attendance' ? 'records.studentId' : 'studentId']: { $in: studentIds } });
  return { filter: { $and: filters }, studentIds };
};

module.exports = { buildExportScope };
