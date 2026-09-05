const ApiError = require('../utils/ApiError');
const { attendanceRepo } = require('../repositories');
const eventBus = require('../patterns/eventBus');
const { ROLES } = require('../constants/roles');
const { buildExportScope } = require('./exportScopeService');

const listAttendance = async (actor, query = {}) => {
  const { filter, studentIds } = await buildExportScope(actor, 'attendance', query);
  if (query.date) {
    const d = new Date(query.date);
    if (!Number.isFinite(d.getTime())) throw new ApiError(400, 'Ngày điểm danh không hợp lệ');
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    filter.date = { $gte: d, $lt: next };
  }
  const documents = await attendanceRepo.find(filter, {
    populate: 'classId subjectId teacherId records.studentId',
    limit: 100,
  });
  if (studentIds === null) return documents;
  const allowed = new Set(studentIds.map(String));
  return documents.map(doc => {
    const result = doc.toObject();
    result.records = result.records.filter(r => allowed.has(String(r.studentId?._id)));
    return result;
  });
};

const recordAttendance = async (actor, data) => {
  const schoolId = actor.schoolId;
  const { classId, subjectId, date, period, records } = data;
  if (!classId || !date || !records?.length) {
    throw new ApiError(400, 'Thiếu classId/date/records');
  }

  const payload = {
    schoolId,
    classId,
    subjectId: subjectId || null,
    teacherId: actor._id,
    date: new Date(date),
    period: period || 1,
    records,
  };

  // upsert by class+date+period
  const existing = await attendanceRepo.findOne({
    schoolId,
    classId,
    date: payload.date,
    period: payload.period,
  });

  let doc;
  if (existing) {
    doc = await attendanceRepo.updateById(existing._id, {
      records,
      subjectId: payload.subjectId,
      teacherId: actor._id,
    });
  } else {
    doc = await attendanceRepo.create(payload);
  }

  eventBus.emit('attendance.recorded', {
    schoolId,
    classId,
    records,
    date: payload.date,
  });

  return doc;
};

module.exports = { listAttendance, recordAttendance };
