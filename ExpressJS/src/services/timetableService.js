const ApiError = require('../utils/ApiError');
const { timetableRepo } = require('../repositories');
const { ROLES } = require('../constants/roles');
const { schoolScope, personalStudentIds, teacherClassScope, objectId } = require('./dataScope');
const User = require('../models/User');
const Class = require('../models/Class');
const AcademicYear = require('../models/AcademicYear');
const Subject = require('../models/Subject');

const listTimetables = async (actor, query = {}) => {
  const clauses = [await schoolScope(actor), await teacherClassScope(actor, 'timetable')];
  if (query.classId) clauses.push({ classId: objectId(query.classId, 'classId') });
  if (query.academicYearId) clauses.push({ academicYearId: objectId(query.academicYearId, 'academicYearId') });
  const studentIds = await personalStudentIds(actor);
  if (studentIds !== null) {
    const students = await User.find({ _id: { $in: studentIds } }).select('classId');
    clauses.push({ classId: { $in: students.map(s => s.classId).filter(Boolean) }, status: 'APPROVED' });
  }
  const filter = { $and: clauses };

  return timetableRepo.find(filter, {
    populate: 'classId slots.subjectId slots.teacherId academicYearId',
    limit: 50,
  });
};

const upsertTimetable = async (actor, data) => {
  const { academicYearId, classId, slots = [], status = 'DRAFT' } = data;
  if (!academicYearId || !classId) throw new ApiError(400, 'Thiếu academicYearId/classId');
  if (status !== 'DRAFT') throw new ApiError(400, 'Lưu bản nháp trước khi duyệt TKB');
  if (!Array.isArray(slots)) throw new ApiError(400, 'slots phải là danh sách');
  if (!(await Class.exists({ _id: objectId(classId), schoolId: actor.schoolId, academicYearId: objectId(academicYearId) })) ||
      !(await AcademicYear.exists({ _id: academicYearId, schoolId: actor.schoolId }))) {
    throw new ApiError(403, 'Lớp/năm học không thuộc trường');
  }
  for (const slot of slots) {
    if (!(await User.exists({ _id: objectId(slot.teacherId, 'teacherId'), schoolId: actor.schoolId, role: { $in: [ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER] } })) ||
        !(await Subject.exists({ _id: objectId(slot.subjectId, 'subjectId'), schoolId: actor.schoolId }))) {
      throw new ApiError(403, 'Giáo viên/môn học không thuộc trường');
    }
  }

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
    return timetableRepo.updateById(existing._id, { slots, status, approvedBy: null });
  }
  return timetableRepo.create({ ...filter, slots, status });
};

const approveTimetable = async (actor, id) => {
  if (![ROLES.SCHOOL_ADMIN].includes(actor.role)) {
    throw new ApiError(403, 'Chỉ Hiệu trưởng được duyệt TKB');
  }
  const scope = await schoolScope(actor);
  const existing = await timetableRepo.findOne({ ...scope, _id: objectId(id) });
  if (!existing) throw new ApiError(404, 'Không tìm thấy TKB');
  const tt = await timetableRepo.model.findOneAndUpdate({ ...scope, _id: existing._id, status: 'DRAFT' }, {
    status: 'APPROVED',
    approvedBy: actor._id,
  }, { new: true, runValidators: true });
  if (!tt) throw new ApiError(409, 'TKB đã được duyệt');
  return tt;
};

module.exports = { listTimetables, upsertTimetable, approveTimetable };
