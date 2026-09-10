const ApiError = require('../utils/ApiError');
const { leaveRepo } = require('../repositories');
const eventBus = require('../patterns/eventBus');
const { LEAVE_STATUS, LEAVE_TYPES } = require('../constants/status');
const { ROLES } = require('../constants/roles');
const { schoolScope, objectId } = require('./dataScope');
const User = require('../models/User');
const Class = require('../models/Class');
const cache = require('./rolePermissionCache');
const schedule = require('./teachingScheduleService');
const scheduleTransaction = require('./scheduleTransaction');
const dates = require('./scheduleDates');

const homeroomStudentIds = async (actor) => {
  const classes = await Class.find({ schoolId: actor.schoolId, homeroomTeacherId: actor._id }).select('_id');
  return (await User.find({ schoolId: actor.schoolId, role: ROLES.STUDENT, classId: { $in: classes.map(c => c._id) } }).select('_id')).map(u => u._id);
};

const listLeaves = async (actor, query = {}) => {
  const filter = await schoolScope(actor);
  if (query.status) filter.status = query.status;

  const canView = await cache.canAccess(actor.role, 'leave', 'view');
  if (!canView || [ROLES.STUDENT, ROLES.PARENT, ROLES.SUBJECT_TEACHER].includes(actor.role)) {
    filter.requesterId = actor._id;
  }
  if (canView && actor.role === ROLES.HOMEROOM_TEACHER) {
    // see class-related + own
    filter.$or = [
      { requesterId: actor._id },
      { type: LEAVE_TYPES.STUDENT_ABSENCE, studentId: { $in: await homeroomStudentIds(actor) } },
    ];
  }

  return leaveRepo.find(filter, {
    populate: 'requesterId studentId reviewedBy makeup.classId makeup.subjectId',
    limit: 100,
  });
};

const createLeave = async (actor, data) => {
  if (!data.type || !data.reason || !data.fromDate || !data.toDate) {
    throw new ApiError(400, 'Thiếu thông tin đơn');
  }
  const from = new Date(data.fromDate), to = new Date(data.toDate);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from > to) {
    throw new ApiError(400, 'Khoảng ngày nghỉ không hợp lệ');
  }

  const allowedByRole = {
    [ROLES.STUDENT]: [LEAVE_TYPES.STUDENT_ABSENCE],
    [ROLES.PARENT]: [LEAVE_TYPES.STUDENT_ABSENCE],
    [ROLES.SUBJECT_TEACHER]: [LEAVE_TYPES.TEACHER_ABSENCE, LEAVE_TYPES.MAKEUP_CLASS],
    [ROLES.HOMEROOM_TEACHER]: [LEAVE_TYPES.TEACHER_ABSENCE, LEAVE_TYPES.MAKEUP_CLASS],
    [ROLES.ACADEMIC_AFFAIRS]: [LEAVE_TYPES.TEACHER_ABSENCE],
    [ROLES.SCHOOL_ADMIN]: [LEAVE_TYPES.TEACHER_ABSENCE],
    [ROLES.ACCOUNTANT]: [LEAVE_TYPES.TEACHER_ABSENCE],
    [ROLES.LIBRARIAN]: [LEAVE_TYPES.TEACHER_ABSENCE],
  };

  const allowed = allowedByRole[actor.role] || [];
  if (!allowed.includes(data.type)) {
    throw new ApiError(403, 'Loại đơn không phù hợp với vai trò của bạn');
  }

  const type = data.type;

  let makeup;
  if (type === LEAVE_TYPES.MAKEUP_CLASS) makeup = await schedule.prepareMakeup(actor, data.makeup);
  if (type === LEAVE_TYPES.TEACHER_ABSENCE) dates.daysBetween(data.fromDate, data.toDate, 366);

  const studentId =
    actor.role === ROLES.STUDENT
      ? actor._id
      : actor.role === ROLES.PARENT
        ? data.studentId
        : null;

  if (type === LEAVE_TYPES.STUDENT_ABSENCE && !studentId) {
    throw new ApiError(400, 'Cần studentId');
  }

  if (actor.role === ROLES.PARENT && !(actor.parentOf || []).map(String).includes(String(studentId))) {
    throw new ApiError(403, 'Học sinh không thuộc phụ huynh này');
  }

  if (studentId && !(await User.exists({ _id: objectId(studentId, 'studentId'), schoolId: actor.schoolId, role: ROLES.STUDENT }))) {
    throw new ApiError(403, 'Học sinh không thuộc trường');
  }
  return leaveRepo.create({
    schoolId: actor.schoolId,
    requesterId: actor._id,
    studentId,
    type,
    reason: data.reason,
    fromDate: makeup?.date || data.fromDate,
    toDate: makeup?.date || data.toDate,
    makeupProposal: typeof data.makeupProposal === 'string' ? data.makeupProposal.slice(0, 2000) : undefined,
    makeup,
    status: LEAVE_STATUS.PENDING,
  });
};

const reviewLeave = async (actor, id, data) => {
  const scope = await schoolScope(actor);
  const leave = await leaveRepo.findOne({ ...scope, _id: objectId(id) });
  if (!leave) throw new ApiError(404, 'Không tìm thấy đơn');
  if (![LEAVE_STATUS.APPROVED, LEAVE_STATUS.REJECTED].includes(data.status)) {
    throw new ApiError(400, 'status phải là APPROVED hoặc REJECTED');
  }

  const canReview = [
    ROLES.SCHOOL_ADMIN,
    ROLES.ACADEMIC_AFFAIRS,
    ROLES.HOMEROOM_TEACHER,
    ROLES.CLUSTER_ADMIN,
  ].includes(actor.role);

  if (!canReview) throw new ApiError(403, 'Không có quyền duyệt');
  if (String(leave.requesterId) === String(actor._id)) throw new ApiError(403, 'Không được tự duyệt đơn');
  if (actor.role === ROLES.HOMEROOM_TEACHER) {
    const ids = await homeroomStudentIds(actor);
    if (leave.type !== LEAVE_TYPES.STUDENT_ABSENCE || !ids.some(id => String(id) === String(leave.studentId))) {
      throw new ApiError(403, 'Chỉ được duyệt đơn nghỉ học của lớp chủ nhiệm');
    }
  }
  const applyReview = async (session = null) => {
    const current = await leaveRepo.model.findOne({ ...scope, _id: leave._id, status: LEAVE_STATUS.PENDING }).session(session);
    if (!current) throw new ApiError(409, 'Đơn đã được xử lý');
    if (data.status === LEAVE_STATUS.APPROVED) {
      if (current.type === LEAVE_TYPES.MAKEUP_CLASS) await schedule.validateMakeup(current, session);
      if (current.type === LEAVE_TYPES.TEACHER_ABSENCE) await schedule.validateAbsence(current, session);
    }
    const result = await leaveRepo.model.findOneAndUpdate(
      { ...scope, _id: leave._id, status: LEAVE_STATUS.PENDING },
      { status: data.status, reviewedBy: actor._id, reviewNote: data.reviewNote || '' },
      { new: true, runValidators: true, session }
    );
    if (!result) throw new ApiError(409, 'Đơn đã được xử lý');
    return result;
  };
  const changesSchedule = data.status === LEAVE_STATUS.APPROVED && leave.type !== LEAVE_TYPES.STUDENT_ABSENCE;
  const reviewed = changesSchedule ? await scheduleTransaction(leave.schoolId, applyReview) : await applyReview();

  eventBus.emit('leave.reviewed', {
    leave: reviewed,
    requesterId: leave.requesterId,
  });

  return reviewed;
};



const cancelMakeup = async (actor, id, data) => {
  if (![ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS, ROLES.CLUSTER_ADMIN].includes(actor.role)) throw new ApiError(403, 'Không có quyền hủy lịch bù');
  const note = typeof data.note === 'string' ? data.note.trim() : '';
  if (!note || note.length > 1000) throw new ApiError(400, 'Cần lý do hủy từ 1 đến 1000 ký tự');
  const filter = { ...await schoolScope(actor), _id: objectId(id) };
  const leave = await leaveRepo.findOne(filter);
  if (!leave) throw new ApiError(404, 'Không tìm thấy đơn');
  if (String(leave.requesterId) === String(actor._id)) throw new ApiError(403, 'Không được tự hủy duyệt đơn của mình');
  const cancelled = await scheduleTransaction(leave.schoolId, async session => {
    const result = await leaveRepo.model.findOneAndUpdate({ ...filter, type: LEAVE_TYPES.MAKEUP_CLASS, status: LEAVE_STATUS.APPROVED },
      { status: LEAVE_STATUS.CANCELLED, cancelledBy: actor._id, cancelledAt: new Date(), cancellationNote: note }, { new: true, runValidators: true, session });
    if (!result) throw new ApiError(409, 'Chỉ hủy được lịch bù đang được duyệt');
    return result;
  });
  eventBus.emit('leave.reviewed', { leave: cancelled, requesterId: leave.requesterId });
  return cancelled;
};
module.exports = { listLeaves, createLeave, reviewLeave, cancelMakeup };
