function createAppointmentService(dependencies) {
  const persistence = dependencies.persistence;
  const ApiError = require("../../../utils/common/http/api-error.util");
  const { ROLES } = require("../../../config/constants/roles.config");
  const { objectId, schoolScope, personalStudentIds } = dependencies.services["data-scope"];
  
  const MANAGERS = [ROLES.SUPER_ADMIN, ROLES.CLUSTER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS];
  const TEACHERS = [ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER];
  const activeStatuses = { $in: ['REQUESTED', 'CONFIRMED'] };
  
  const appointmentFilter = async actor => {
    const scope = await schoolScope(actor);
    if (actor.role === ROLES.PARENT) return { ...scope, parentId: actor._id };
    if (TEACHERS.includes(actor.role)) return { ...scope, teacherId: actor._id };
    return scope;
  };
  
  const surveyFilter = async actor => {
    const scope = await schoolScope(actor);
    if (actor.role === ROLES.PARENT) return { ...scope, respondentId: actor._id };
    if (TEACHERS.includes(actor.role)) {
      const appointments = await persistence.appointmentsFind({ ...scope, teacherId: actor._id });
      return { schoolId: actor.schoolId, appointmentId: { $in: appointments.map(x => x._id) } };
    }
    return scope;
  };
  
  const populate = query => persistence.populatePopulate(query, { scheduledAt: 1 });
  
  const createAppointment = async (actor, data = {}) => {
    if (actor.role !== ROLES.PARENT) throw new ApiError(403, 'Chỉ phụ huynh được đặt lịch');
    if (!data.studentId || !data.teacherId || !data.scheduledAt || !String(data.reason || '').trim()) {
      throw new ApiError(400, 'Thiếu học sinh, giáo viên, thời gian hoặc lý do');
    }
    const studentId = objectId(data.studentId, 'studentId');
    const teacherId = objectId(data.teacherId, 'teacherId');
    const ids = await personalStudentIds(actor);
    if (!ids.some(id => String(id) === String(studentId))) throw new ApiError(403, 'Học sinh không thuộc tài khoản phụ huynh');
    const student = await persistence.studentFindOne({ _id: studentId, schoolId: actor.schoolId, role: ROLES.STUDENT });
    const teacher = await persistence.teacherFindOne({ _id: teacherId, schoolId: actor.schoolId, role: { $in: TEACHERS } });
    if (!student || !teacher) throw new ApiError(404, 'Không tìm thấy học sinh hoặc giáo viên trong trường');
    const start = new Date(data.scheduledAt);
    if (Number.isNaN(start.getTime()) || start <= new Date()) throw new ApiError(400, 'Thời gian hẹn phải ở tương lai');
    const durationMinutes = Number(data.durationMinutes || 30);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 120) throw new ApiError(400, 'Thời lượng phải từ 15 đến 120 phút');
    const end = new Date(start.getTime() + durationMinutes * 60000);
    const overlapStart = new Date(start.getTime() - 120 * 60000);
    const busy = await persistence.busyFind({ teacherId, status: activeStatuses, scheduledAt: { $gte: overlapStart, $lt: end } });
    if (busy.some(row => new Date(row.scheduledAt).getTime() < end.getTime() && new Date(row.scheduledAt).getTime() + Number(row.durationMinutes) * 60000 > start.getTime())) {
      throw new ApiError(409, 'Giáo viên đã có lịch trong khoảng thời gian này');
    }
    return persistence.createAppointmentCreate({
      schoolId: student.schoolId,
      parentId: actor._id,
      studentId,
      teacherId,
      scheduledAt: start,
      durationMinutes,
      mode: data.mode === 'OFFLINE' ? 'OFFLINE' : 'ONLINE',
      meetingUrl: String(data.meetingUrl || '').trim(),
      reason: String(data.reason).trim(),
    });
  };
  
  const listAppointments = async (actor, query = {}) => {
    const filter = await appointmentFilter(actor);
    if (query.status) filter.status = String(query.status).toUpperCase();
    return populate(persistence.listAppointmentsFind(filter));
  };
  
  const reviewAppointment = async (actor, id, data = {}) => {
    if (!MANAGERS.includes(actor.role) && !TEACHERS.includes(actor.role)) throw new ApiError(403, 'Không có quyền xử lý lịch hẹn');
    const row = await persistence.rowFindOne({ _id: objectId(id), ...(await schoolScope(actor)) });
    if (!row) throw new ApiError(404, 'Không tìm thấy lịch hẹn');
    if (TEACHERS.includes(actor.role) && String(row.teacherId) !== String(actor._id)) throw new ApiError(403, 'Lịch hẹn không thuộc giáo viên này');
    const status = String(data.status || '').toUpperCase();
    if (!['CONFIRMED', 'DECLINED', 'COMPLETED'].includes(status)) throw new ApiError(400, 'Trạng thái lịch hẹn không hợp lệ');
    if (!['REQUESTED', 'CONFIRMED'].includes(row.status) && status !== 'COMPLETED') throw new ApiError(409, 'Lịch hẹn đã được xử lý');
    row.status = status;
    row.responseNote = String(data.responseNote || '').trim();
    if (data.meetingUrl !== undefined) row.meetingUrl = String(data.meetingUrl || '').trim();
    row.respondedAt = new Date();
    return persistence.reviewAppointmentSave(row);
  };
  
  const cancelAppointment = async (actor, id) => {
    const row = await persistence.rowFindOne2({ _id: objectId(id), ...(await appointmentFilter(actor)) });
    if (!row) throw new ApiError(404, 'Không tìm thấy lịch hẹn');
    if (!['REQUESTED', 'CONFIRMED'].includes(row.status)) throw new ApiError(409, 'Lịch hẹn đã được xử lý');
    row.status = 'CANCELLED';
    return persistence.cancelAppointmentSave(row);
  };
  
  const listSurveys = async actor => persistence.listSurveysFind(await surveyFilter(actor), { createdAt: -1 });
  
  const submitSurvey = async (actor, appointmentId, data = {}) => {
    if (actor.role !== ROLES.PARENT) throw new ApiError(403, 'Chỉ phụ huynh được gửi khảo sát');
    const row = await persistence.rowFindOne3({ _id: objectId(appointmentId), ...(await appointmentFilter(actor)) });
    if (!row) throw new ApiError(404, 'Không tìm thấy lịch hẹn');
    if (row.status !== 'COMPLETED') throw new ApiError(409, 'Chỉ khảo sát sau khi hoàn tất buổi hẹn');
    const rating = Number(data.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ApiError(400, 'Đánh giá phải từ 1 đến 5');
    try {
      return await persistence.submitSurveyCreate({ schoolId: row.schoolId, appointmentId: row._id, respondentId: actor._id, rating, comment: String(data.comment || '').trim() });
    } catch (error) {
      if (error.code === 11000) throw new ApiError(409, 'Lịch hẹn đã được khảo sát');
      throw error;
    }
  };
  
  return { createAppointment, listAppointments, reviewAppointment, cancelAppointment, listSurveys, submitSurvey };
  
}

class AppointmentService {
  constructor(dependencies) {
    Object.assign(this, createAppointmentService(dependencies));
  }
}

module.exports = AppointmentService;
