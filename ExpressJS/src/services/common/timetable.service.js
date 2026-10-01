function createTimetableService(dependencies) {
  const persistence = dependencies.persistence;
  const ApiError = require("../../utils/common/api-error.util");
  const { timetableRepo } = dependencies.repositories["shared"];
  const { ROLES } = require("../../config/constants/roles.config");
  const { schoolScope, personalStudentIds, objectId } = dependencies.services["data-scope"];
  const scopeFor = dependencies.services["timetable-scope"];
  const transaction = dependencies.services["schedule-transaction"];
  const schedule = dependencies.services["teaching-schedule"];
  const dates = dependencies.services["schedule-dates"];
  
  const listTimetables = async (actor, query = {}) => {
    const scope = await scopeFor(actor, query);
    if (await personalStudentIds(actor) !== null) scope.$and.push({ status: 'APPROVED' });
    return persistence.listTimetablesFind(scope, { populate: 'classId slots.subjectId slots.teacherId academicYearId', limit: 50 });
  };
  
  const validateReferences = async (schoolId, academicYearId, classId, slots, session = null) => {
    if (!(await persistence.validateReferencesExists({ _id: objectId(classId), schoolId, academicYearId: objectId(academicYearId) }, session)) ||
        !(await persistence.validateReferencesExists2({ _id: academicYearId, schoolId }, session))) throw new ApiError(403, 'Lớp/năm học không thuộc trường');
    const teachers = [...new Set(slots.map(s => String(s.teacherId)))];
    const subjects = [...new Set(slots.map(s => String(s.subjectId)))];
    const teacherCount = await persistence.teacherCountCountDocuments({ _id: { $in: teachers }, schoolId, status: 'ACTIVE', role: { $in: [ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER] } }, session);
    const subjectCount = await persistence.subjectCountCountDocuments({ _id: { $in: subjects }, schoolId }, session);
    if (teacherCount !== teachers.length || subjectCount !== subjects.length) throw new ApiError(403, 'Giáo viên/môn học không thuộc trường hoặc đã ngừng hoạt động');
  };
  const normalizeSlots = slots => {
    if (!Array.isArray(slots) || slots.length > 70) throw new ApiError(400, 'TKB tối đa 70 tiết mỗi tuần');
    const occupied = new Set();
    return slots.map(slot => {
      if (!slot || !Number.isInteger(slot.dayOfWeek) || slot.dayOfWeek < 1 || slot.dayOfWeek > 7) throw new ApiError(400, 'Thứ phải là số nguyên từ 1 đến 7');
      const period = dates.period(slot.period);
      const key = `${slot.dayOfWeek}:${period}`;
      if (occupied.has(key)) throw new ApiError(400, 'Một lớp không thể có hai môn trong cùng tiết');
      occupied.add(key);
      return { dayOfWeek: slot.dayOfWeek, period, teacherId: objectId(slot.teacherId, 'teacherId'),
        subjectId: objectId(slot.subjectId, 'subjectId'), room: dates.room(slot.room) };
    });
  };
  const upsertTimetable = async (actor, data) => {
    const { academicYearId, classId, status = 'DRAFT' } = data;
    if (!academicYearId || !classId) throw new ApiError(400, 'Thiếu academicYearId/classId');
    if (status !== 'DRAFT') throw new ApiError(400, 'Lưu bản nháp trước khi duyệt TKB');
    const slots = normalizeSlots(data.slots || []);
    await validateReferences(actor.schoolId, academicYearId, classId, slots);
    return transaction(actor.schoolId, async session => {
      await validateReferences(actor.schoolId, academicYearId, classId, slots, session);
      const filter = { schoolId: actor.schoolId, academicYearId, classId };
      return persistence.upsertTimetableFindOneAndUpdate(filter, { slots, status, approvedBy: null }, { new: true, upsert: true, runValidators: true, session });
    });
  };
  const approveTimetable = async (actor, id) => {
    if (actor.role !== ROLES.SCHOOL_ADMIN) throw new ApiError(403, 'Chỉ Hiệu trưởng được duyệt TKB');
    const scope = await schoolScope(actor);
    const filter = { ...scope, _id: objectId(id) };
    const existing = await persistence.existingFindOne(filter);
    if (!existing) throw new ApiError(404, 'Không tìm thấy TKB');
    return transaction(existing.schoolId, async session => {
      const table = await persistence.tableFindOne(filter, session);
      if (!table || table.status !== 'DRAFT') throw new ApiError(409, 'TKB đã được duyệt');
      normalizeSlots(table.slots);
      await validateReferences(table.schoolId, table.academicYearId, table.classId, table.slots, session);
      await schedule.validateWeekly(table, session);
      table.status = 'APPROVED';
      table.approvedBy = actor._id;
      return persistence.approveTimetableSave(table, { session });
    });
  };
  return { listTimetables, upsertTimetable, approveTimetable };
  
}

class TimetableService {
  constructor(dependencies) {
    Object.assign(this, createTimetableService(dependencies));
  }
}

module.exports = TimetableService;
