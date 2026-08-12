const ApiError = require('../utils/ApiError');
const { attendanceRepo } = require('../repositories');
const eventBus = require('../patterns/eventBus');
const { ROLES } = require('../constants/roles');

const listAttendance = async (actor, query = {}) => {
  const filter = {};
  if (actor.schoolId) filter.schoolId = actor.schoolId;
  if (query.classId) filter.classId = query.classId;
  if (query.date) {
    const d = new Date(query.date);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    filter.date = { $gte: d, $lt: next };
  }
  if ([ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER].includes(actor.role)) {
    filter.teacherId = actor._id;
  }
  if (actor.role === ROLES.STUDENT) {
    filter['records.studentId'] = actor._id;
  }
  if (actor.role === ROLES.PARENT) {
    filter['records.studentId'] = { $in: actor.parentOf || [] };
  }
  return attendanceRepo.find(filter, {
    populate: 'classId subjectId teacherId records.studentId',
    limit: 100,
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
