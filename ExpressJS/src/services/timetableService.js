const ApiError = require('../utils/ApiError');
const { timetableRepo } = require('../repositories');
const { ROLES } = require('../constants/roles');

const listTimetables = async (actor, query = {}) => {
  const filter = {};
  if (actor.schoolId) filter.schoolId = actor.schoolId;
  if (query.classId) filter.classId = query.classId;
  if (query.academicYearId) filter.academicYearId = query.academicYearId;

  if (actor.role === ROLES.STUDENT && actor.classId) filter.classId = actor.classId;
  if (actor.role === ROLES.PARENT) {
    // parents see children's classes — simplified via query.classId from FE
  }

  return timetableRepo.find(filter, {
    populate: 'classId slots.subjectId slots.teacherId academicYearId',
    limit: 50,
  });
};

const upsertTimetable = async (actor, data) => {
  const { academicYearId, classId, slots = [], status = 'DRAFT' } = data;
  if (!academicYearId || !classId) throw new ApiError(400, 'Thiếu academicYearId/classId');

  // basic conflict check: same teacher same day/period
  const teacherSlots = {};
  for (const slot of slots) {
    const key = `${slot.teacherId}-${slot.dayOfWeek}-${slot.period}`;
    if (teacherSlots[key]) {
      throw new ApiError(400, `Trùng lịch giáo viên: ngày ${slot.dayOfWeek} tiết ${slot.period}`);
    }
    teacherSlots[key] = true;
  }

  const filter = {
    schoolId: actor.schoolId,
    academicYearId,
    classId,
  };
  const existing = await timetableRepo.findOne(filter);
  if (existing) {
    return timetableRepo.updateById(existing._id, { slots, status });
  }
  return timetableRepo.create({ ...filter, slots, status });
};

const approveTimetable = async (actor, id) => {
  if (![ROLES.SCHOOL_ADMIN].includes(actor.role)) {
    throw new ApiError(403, 'Chỉ Hiệu trưởng được duyệt TKB');
  }
  const tt = await timetableRepo.updateById(id, {
    status: 'APPROVED',
    approvedBy: actor._id,
  });
  if (!tt) throw new ApiError(404, 'Không tìm thấy TKB');
  return tt;
};

module.exports = { listTimetables, upsertTimetable, approveTimetable };
