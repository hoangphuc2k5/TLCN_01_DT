const ApiError = require('../utils/ApiError');
const { timetableRepo } = require('../repositories');
const { ROLES } = require('../constants/roles');
const { schoolScope, personalStudentIds, objectId } = require('./dataScope');
const Class = require('../models/Class');
const User = require('../models/User');
const AcademicYear = require('../models/AcademicYear');
const Subject = require('../models/Subject');
const scopeFor = require('./timetableScope');
const transaction = require('./scheduleTransaction');
const schedule = require('./teachingScheduleService');
const dates = require('./scheduleDates');

const listTimetables = async (actor, query = {}) => {
  const scope = await scopeFor(actor, query);
  if (await personalStudentIds(actor) !== null) scope.$and.push({ status: 'APPROVED' });
  return timetableRepo.find(scope, { populate: 'classId slots.subjectId slots.teacherId academicYearId', limit: 50 });
};

const validateReferences = async (schoolId, academicYearId, classId, slots, session = null) => {
  if (!(await Class.exists({ _id: objectId(classId), schoolId, academicYearId: objectId(academicYearId) }).session(session)) ||
      !(await AcademicYear.exists({ _id: academicYearId, schoolId }).session(session))) throw new ApiError(403, 'Lớp/năm học không thuộc trường');
  const teachers = [...new Set(slots.map(s => String(s.teacherId)))];
  const subjects = [...new Set(slots.map(s => String(s.subjectId)))];
  const teacherCount = await User.countDocuments({ _id: { $in: teachers }, schoolId, status: 'ACTIVE', role: { $in: [ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER] } }).session(session);
  const subjectCount = await Subject.countDocuments({ _id: { $in: subjects }, schoolId }).session(session);
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
    return timetableRepo.model.findOneAndUpdate(filter, { slots, status, approvedBy: null },
      { new: true, upsert: true, runValidators: true, session });
  });
};
const approveTimetable = async (actor, id) => {
  if (actor.role !== ROLES.SCHOOL_ADMIN) throw new ApiError(403, 'Chỉ Hiệu trưởng được duyệt TKB');
  const scope = await schoolScope(actor);
  const filter = { ...scope, _id: objectId(id) };
  const existing = await timetableRepo.findOne(filter);
  if (!existing) throw new ApiError(404, 'Không tìm thấy TKB');
  return transaction(existing.schoolId, async session => {
    const table = await timetableRepo.model.findOne(filter).session(session);
    if (!table || table.status !== 'DRAFT') throw new ApiError(409, 'TKB đã được duyệt');
    normalizeSlots(table.slots);
    await validateReferences(table.schoolId, table.academicYearId, table.classId, table.slots, session);
    await schedule.validateWeekly(table, session);
    table.status = 'APPROVED';
    table.approvedBy = actor._id;
    return table.save({ session });
  });
};
module.exports = { listTimetables, upsertTimetable, approveTimetable };
