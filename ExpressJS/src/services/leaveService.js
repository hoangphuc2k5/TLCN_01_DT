const ApiError = require('../utils/ApiError');
const { leaveRepo } = require('../repositories');
const eventBus = require('../patterns/eventBus');
const { LEAVE_STATUS, LEAVE_TYPES } = require('../constants/status');
const { ROLES } = require('../constants/roles');
const { schoolScope, objectId } = require('./dataScope');
const User = require('../models/User');
const Class = require('../models/Class');

const homeroomStudentIds = async (actor) => {
  const classes = await Class.find({ schoolId: actor.schoolId, homeroomTeacherId: actor._id }).select('_id');
  return (await User.find({ schoolId: actor.schoolId, role: ROLES.STUDENT, classId: { $in: classes.map(c => c._id) } }).select('_id')).map(u => u._id);
};

const listLeaves = async (actor, query = {}) => {
  const filter = await schoolScope(actor);
  if (query.status) filter.status = query.status;

  if ([ROLES.STUDENT, ROLES.PARENT, ROLES.SUBJECT_TEACHER].includes(actor.role)) {
    filter.requesterId = actor._id;
  }
  if (actor.role === ROLES.HOMEROOM_TEACHER) {
    // see class-related + own
    filter.$or = [
      { requesterId: actor._id },
      { type: LEAVE_TYPES.STUDENT_ABSENCE, studentId: { $in: await homeroomStudentIds(actor) } },
    ];
  }

  return leaveRepo.find(filter, {
    populate: 'requesterId studentId reviewedBy',
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

  if (type === LEAVE_TYPES.MAKEUP_CLASS && !data.makeupProposal) {
    throw new ApiError(400, 'Cần đề xuất lịch dạy bù');
  }

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
    fromDate: data.fromDate,
    toDate: data.toDate,
    makeupProposal: data.makeupProposal || undefined,
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
  const reviewed = await leaveRepo.model.findOneAndUpdate(
    { ...scope, _id: leave._id, status: LEAVE_STATUS.PENDING },
    { status: data.status, reviewedBy: actor._id, reviewNote: data.reviewNote || '' },
    { new: true, runValidators: true }
  );
  if (!reviewed) throw new ApiError(409, 'Đơn đã được xử lý');

  eventBus.emit('leave.reviewed', {
    leave: reviewed,
    requesterId: leave.requesterId,
  });

  return reviewed;
};

module.exports = { listLeaves, createLeave, reviewLeave };
