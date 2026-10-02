function createTeachingScheduleService(dependencies) {
  const persistence = dependencies.persistence;
  const ApiError = require("../../utils/common/api-error.util");
  const { ROLES } = require("../../config/constants/roles.config");
  const { objectId } = dependencies.services["data-scope"];
  const scopeFor = dependencies.services["timetable-scope"];
  const dates = dependencies.services["schedule-dates"];
  const same = (a, b) => String(a?._id || a) === String(b?._id || b);
  const approved = { status: 'APPROVED' };
  const populate = [{ path: 'classId', select: 'name' }, { path: 'academicYearId', select: 'name startDate endDate' }, { path: 'slots.subjectId', select: 'name' }, { path: 'slots.teacherId', select: 'name' }];
  const roomKey = value => dates.room(value).toLocaleLowerCase('vi');
  const overlaps = (a, b) => same(a.classId, b.classId) || same(a.teacherId, b.teacherId) ||
    (!!roomKey(a.room) && roomKey(a.room) === roomKey(b.room));
  const absenceFor = (leaves, teacherId, date) => leaves.find(l => same(l.requesterId, teacherId) && dates.inRange(date, l.fromDate, l.toDate));
  
  // Projection contains schedule details only: never expose the reason or review note.
  const project = (tables, leaves, makeups, days) => {
    const rows = [];
    for (const table of tables) {
      if (!table.academicYearId?.startDate) continue;
      for (const date of days) {
        if (!dates.inRange(date, table.academicYearId.startDate, table.academicYearId.endDate)) continue;
        for (const slot of table.slots.filter(s => s.dayOfWeek === dates.weekday(date))) {
          const absence = absenceFor(leaves, slot.teacherId, date);
          rows.push({ ...slot, date, classId: table.classId, academicYearId: table.academicYearId,
            timetableId: table._id, key: `${table._id}:${date}:${slot.period}`,
            kind: absence ? 'CANCELLED' : 'REGULAR', absenceId: absence?._id });
        }
      }
    }
    for (const leave of makeups) {
      rows.push({ ...leave.makeup, key: String(leave._id), leaveId: leave._id, kind: 'MAKEUP' });
    }
    return rows.sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period || a.key.localeCompare(b.key));
  };
  
  const schedule = async (actor, query) => {
    const days = dates.daysBetween(query.fromDate, query.toDate);
    const scope = await scopeFor(actor, query);
    const tables = await persistence.tablesFind({ $and: [scope, approved] }, populate);
    // Reuse class/tenant scope for exceptions, even if a weekly table is currently a draft.
    const remap = value => {
      if (Array.isArray(value)) return value.map(remap);
      if (!value || value.constructor !== Object) return value;
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [
        ['classId', 'academicYearId'].includes(key) ? `makeup.${key}` : key, remap(child),
      ]));
    };
    const makeupScope = remap(scope.$and);
    const makeups = await persistence.makeupsFind({ $and: makeupScope, ...approved, type: 'MAKEUP_CLASS', 'makeup.date': { $gte: days[0], $lte: days.at(-1) } }, ['classId', 'subjectId', 'teacherId', 'academicYearId'].map(field => ({ path: `makeup.${field}`, select: 'name' })));
    const schoolIds = [...new Set(tables.map(t => String(t.schoolId)))];
    const absences = await persistence.absencesFind({ schoolId: { $in: schoolIds }, ...approved, type: 'TEACHER_ABSENCE',
      fromDate: { $lt: new Date(Date.parse(days.at(-1)) + dates.DAY) }, toDate: { $gte: new Date(days[0]) } });
    return project(tables, absences, makeups, days);
  };
  
  const prepareMakeup = async (actor, input, session = null) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ApiError(400, 'Cần chọn tiết nghỉ và lịch dạy bù cụ thể');
    const originalDate = dates.parseDate(input.originalDate), date = dates.parseDate(input.date);
    const originalPeriod = dates.period(input.originalPeriod), period = dates.period(input.period);
    if (date <= originalDate) throw new ApiError(400, 'Ngày dạy bù phải sau ngày nghỉ');
    const absence = await persistence.absenceFindOne({ _id: objectId(input.absenceId, 'absenceId'), schoolId: actor.schoolId,
      requesterId: actor._id, type: 'TEACHER_ABSENCE', ...approved }, session);
    if (!absence || !dates.inRange(originalDate, absence.fromDate, absence.toDate)) throw new ApiError(409, 'Tiết gốc phải thuộc đơn nghỉ dạy đã duyệt của bạn');
    const table = await persistence.tableFindOne({ _id: objectId(input.timetableId, 'timetableId'), schoolId: actor.schoolId, ...approved }, session);
    const slot = table?.slots.find(s => s.dayOfWeek === dates.weekday(originalDate) && s.period === originalPeriod && same(s.teacherId, actor._id));
    if (!slot) throw new ApiError(409, 'Không tìm thấy tiết dạy của bạn trong TKB đã duyệt');
    const year = await persistence.yearFindOne({ _id: table.academicYearId, schoolId: actor.schoolId }, session);
    if (!year || !dates.inRange(originalDate, year.startDate, year.endDate) || !dates.inRange(date, year.startDate, year.endDate)) throw new ApiError(400, 'Tiết nghỉ và tiết bù phải trong cùng năm học');
    if (!await persistence.prepareMakeupExists({ schoolId: actor.schoolId, teacherId: actor._id, classId: table.classId,
      subjectId: slot.subjectId, academicYearId: table.academicYearId }, session)) throw new ApiError(403, 'Bạn không còn được phân công môn/lớp này');
    if (!await persistence.prepareMakeupExists2({ _id: actor._id, schoolId: actor.schoolId, status: 'ACTIVE', role: { $in: [ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER] } }, session)) throw new ApiError(403, 'Giáo viên không còn hoạt động trong trường');
    return { absenceId: absence._id, timetableId: table._id, classId: table.classId, academicYearId: table.academicYearId,
      subjectId: slot.subjectId, teacherId: actor._id, originalDate, originalPeriod, date, period, room: dates.room(input.room) };
  };
  
  const validateMakeup = async (leave, session) => {
    const m = await prepareMakeup({ _id: leave.requesterId, schoolId: leave.schoolId }, leave.makeup, session);
    // Revalidate the snapshot at approval; changed assignments/weekly slots need a new request.
    for (const field of ['classId', 'academicYearId', 'subjectId', 'teacherId']) {
      if (!same(m[field], leave.makeup[field])) throw new ApiError(409, 'Tiết gốc đã thay đổi; vui lòng gửi lại đơn');
    }
    const previous = await persistence.previousExists({ schoolId: leave.schoolId, ...approved, type: 'MAKEUP_CLASS',
      'makeup.timetableId': m.timetableId, 'makeup.originalDate': m.originalDate, 'makeup.originalPeriod': m.originalPeriod }, session);
    if (previous) throw new ApiError(409, 'Tiết nghỉ này đã có lịch dạy bù');
    const absences = await persistence.absencesFind2({ schoolId: leave.schoolId, ...approved, type: 'TEACHER_ABSENCE',
      fromDate: { $lt: new Date(Date.parse(m.date) + dates.DAY) }, toDate: { $gte: new Date(m.date) } }, session);
    if (absenceFor(absences, m.teacherId, m.date)) throw new ApiError(409, 'Giáo viên đang nghỉ vào ngày dạy bù');
    const tables = await persistence.tablesFind2({ schoolId: leave.schoolId, ...approved }, session);
    const makeups = await persistence.makeupsFind2({ schoolId: leave.schoolId, ...approved, type: 'MAKEUP_CLASS', 'makeup.date': m.date }, session);
    const occupied = project(tables, absences, makeups, [m.date]);
    if (occupied.some(row => row.kind !== 'CANCELLED' && row.period === m.period && overlaps(row, m))) {
      throw new ApiError(409, 'Trùng lịch giáo viên, lớp hoặc phòng vào tiết dạy bù');
    }
    return m;
  };
  
  const validateAbsence = async (leave, session) => {
    const conflict = await persistence.conflictExists({ schoolId: leave.schoolId, requesterId: leave.requesterId, ...approved, type: 'MAKEUP_CLASS',
      'makeup.date': { $gte: dates.dateKey(leave.fromDate), $lte: dates.dateKey(leave.toDate) } }, session);
    if (conflict) throw new ApiError(409, 'Khoảng nghỉ chứa lịch dạy bù đã duyệt; cần xử lý lịch bù trước');
  };
  
  const validateWeekly = async (table, session) => {
    const year = await persistence.yearFindOne2({ _id: table.academicYearId, schoolId: table.schoolId }, session);
    if (!year) throw new ApiError(409, 'Năm học không còn thuộc trường');
    const peers = await persistence.peersFind({ schoolId: table.schoolId, _id: { $ne: table._id }, ...approved }, session);
    for (const peer of peers) {
      const otherYear = peer.academicYearId;
      if (!otherYear || otherYear.startDate > year.endDate || otherYear.endDate < year.startDate) continue;
      if (table.slots.some(a => peer.slots.some(b => a.dayOfWeek === b.dayOfWeek && a.period === b.period && overlaps({ ...a.toObject(), classId: table.classId }, { ...b, classId: peer.classId })))) {
        throw new ApiError(409, 'TKB trùng giáo viên, lớp hoặc phòng với TKB đã duyệt');
      }
    }
    const makeups = await persistence.makeupsFind3({ schoolId: table.schoolId, ...approved, type: 'MAKEUP_CLASS',
      'makeup.date': { $gte: dates.dateKey(year.startDate), $lte: dates.dateKey(year.endDate) } }, session);
    const absences = await persistence.absencesFind3({ schoolId: table.schoolId, ...approved, type: 'TEACHER_ABSENCE',
      fromDate: { $lte: year.endDate }, toDate: { $gte: year.startDate } }, session);
    for (const leave of makeups) {
      const m = leave.makeup;
      if (table.slots.some(s => s.dayOfWeek === dates.weekday(m.date) && s.period === m.period && !absenceFor(absences, s.teacherId, m.date) && overlaps({ ...s.toObject(), classId: table.classId }, m))) {
        throw new ApiError(409, 'TKB trùng lịch dạy bù đã duyệt');
      }
    }
  };
  return { schedule, prepareMakeup, validateMakeup, validateAbsence, validateWeekly };
  
}

class TeachingScheduleService {
  constructor(dependencies) {
    Object.assign(this, createTeachingScheduleService(dependencies));
  }
}

module.exports = TeachingScheduleService;
