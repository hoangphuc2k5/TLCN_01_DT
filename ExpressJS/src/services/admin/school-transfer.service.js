const ApiError = require('../../utils/common/http/api-error.util');
const same = (a, b) => String(a?._id || a) === String(b?._id || b);
class SchoolTransferService {
  constructor(dependencies) {
    const { persistence: repo, services } = dependencies;
    const { objectId } = services['data-scope'];
    const transaction = services['schedule-transaction'];
    const admin = actor => {
      if (!['SUPER_ADMIN', 'CLUSTER_ADMIN', 'SCHOOL_ADMIN'].includes(actor?.role)) throw new ApiError(403, 'Chỉ quản trị viên được xử lý chuyển trường');
    };
    const manages = async (actor, schoolId, session) => {
      admin(actor);
      const school = await repo.school(schoolId, session);
      if (!school) throw new ApiError(404, 'Không tìm thấy trường');
      if (actor.role !== 'SUPER_ADMIN' && !(actor.role === 'CLUSTER_ADMIN' ? actor.clusterId && same(actor.clusterId, school.clusterId) : actor.schoolId && same(actor.schoolId, schoolId))) throw new ApiError(403, 'Ngoài phạm vi trường');
      return school;
    };
    const visible = async (actor, request) => {
      admin(actor);
      if (!request) throw new ApiError(404, 'Không tìm thấy yêu cầu');
      if (actor.role === 'SUPER_ADMIN') return;
      const [from, to] = await Promise.all([repo.school(request.fromSchoolId), repo.school(request.toSchoolId)]);
      const allowed = actor.role === 'CLUSTER_ADMIN'
        ? actor.clusterId && [from, to].some(s => s && same(s.clusterId, actor.clusterId))
        : actor.schoolId && [request.fromSchoolId, request.toSchoolId].some(s => same(s, actor.schoolId));
      if (!allowed) throw new ApiError(403, 'Ngoài phạm vi yêu cầu');
    };
    const text = (value, name) => {
      if (typeof value !== 'string' || !value.trim() || value.trim().length > 1000) throw new ApiError(400, `${name} phải có từ 1 đến 1000 ký tự`);
      return value.trim();
    };
    const event = (action, actor, note = '') => ({ action, actorId: actor._id, at: new Date(), note });
    const notifySchool = async (request, actor, action, receiving, note, session) => {
      if (action !== 'approve' && action !== 'accept' && !(action === 'reject' && receiving)) return [];
      const schoolId = action === 'approve' ? request.toSchoolId : request.fromSchoolId;
      const recipients = await repo.activeSchoolAdmins(schoolId, session);
      if (!recipients.length) return [];
      const from = await repo.school(request.fromSchoolId, session);
      const to = await repo.school(request.toSchoolId, session);
      const classroom = action === 'accept' ? await repo.classroom(request.toClassId, session) : null;
      const title = action === 'approve' ? 'Yêu cầu tiếp nhận học sinh chuyển trường'
        : action === 'accept' ? 'Học sinh chuyển trường đã được tiếp nhận' : 'Yêu cầu chuyển trường bị từ chối';
      const message = action === 'approve'
        ? `${from?.name || 'Trường đi'} đề nghị chuyển học sinh ${request.studentName} đến trường bạn. Vui lòng xem hồ sơ và xác nhận tiếp nhận.`
        : action === 'accept'
          ? `${to?.name || 'Trường đến'} đã tiếp nhận học sinh ${request.studentName} vào lớp ${classroom?.name || ''}.`
          : `${to?.name || 'Trường đến'} đã từ chối tiếp nhận học sinh ${request.studentName}. Lý do: ${note}`;
      return repo.createNotifications(recipients.map(recipient => ({
        userId: recipient._id, schoolId, title, message: `${message} Người thực hiện: ${actor.name || 'Quản trị viên'}.`,
        type: 'SCHOOL_TRANSFER', emailState: 'NOT_REQUESTED',
        meta: { transferId: request._id, studentId: request.studentId, status: request.status, actorId: actor._id },
      })), session);
    };
    this.schools = async actor => { admin(actor); return repo.schools(); };
    this.list = async actor => {
      admin(actor);
      const scope = await services['data-scope'].schoolScope(actor);
      const school = scope.schoolId;
      return repo.list(school ? { $or: [{ fromSchoolId: school }, { toSchoolId: school }] } : {});
    };
    this.detail = async (actor, id) => {
      const request = await repo.find(objectId(id));
      await visible(actor, request);
      // Receiving school sees the shared academic snapshot only after release by the source.
      const result = request.toObject();
      if (request.status === 'PENDING') delete result.handover;
      return result;
    };
    this.create = async (actor, data) => {
      admin(actor);
      const studentId = objectId(data.studentId, 'studentId');
      const toSchoolId = objectId(data.toSchoolId, 'toSchoolId');
      const reason = text(data.reason, 'Lý do');
      const requestedDate = new Date(data.requestedDate);
      if (!data.requestedDate || !Number.isFinite(requestedDate.getTime())) throw new ApiError(400, 'Ngày dự kiến không hợp lệ');
      const initial = await repo.student(studentId);
      if (!initial) throw new ApiError(404, 'Không tìm thấy học sinh');
      await manages(actor, initial.schoolId);
      try {
        return await transaction(initial.schoolId, async session => {
          await repo.lockStudent(studentId, session);
          const student = await repo.student(studentId, session);
          await manages(actor, student.schoolId, session);
          const school = await repo.school(toSchoolId, session);
          if (!school || school.status !== 'ACTIVE' || same(student.schoolId, toSchoolId)) throw new ApiError(400, 'Cần trường đích hoạt động và khác trường hiện tại');
          const source = await repo.classroom(student.classId, session);
          if (student.status !== 'ACTIVE' || !source || !same(source.schoolId, student.schoolId)) throw new ApiError(400, 'Học sinh cần đang hoạt động và có lớp hợp lệ');
          return repo.create({ studentId, studentName: student.name, fromSchoolId: student.schoolId, fromClassId: student.classId,
            toSchoolId, gradeLevel: source.gradeLevel, reason, requestedDate, createdBy: actor._id, history: [event('CREATE', actor, reason)] }, session);
        });
      } catch (error) {
        if (error.code === 11000) throw new ApiError(409, 'Học sinh đã có yêu cầu chuyển trường đang xử lý');
        throw error;
      }
    };
    this.decide = async (actor, id, data) => {
      admin(actor);
      const action = data.action;
      if (!['approve', 'accept', 'reject', 'cancel'].includes(action)) throw new ApiError(400, 'Thao tác không hợp lệ');
      const note = ['reject', 'cancel'].includes(action) ? text(data.note, 'Lý do') : '';
      const initial = await repo.find(objectId(id));
      await visible(actor, initial);
      const receiving = action === 'accept' || (action === 'reject' && initial.status === 'APPROVED');
      const schoolId = receiving ? initial.toSchoolId : initial.fromSchoolId;
      await manages(actor, schoolId);
      const result = await transaction(schoolId, async session => {
        await repo.lockStudent(initial.studentId, session);
        const request = await repo.find(initial._id, session);
        await manages(actor, receiving ? request.toSchoolId : request.fromSchoolId, session);
        if (!request.open || (action === 'approve' && request.status !== 'PENDING') || (action === 'accept' && request.status !== 'APPROVED') || (action === 'reject' && request.status !== initial.status)) throw new ApiError(409, 'Trạng thái yêu cầu đã thay đổi');
        const student = await repo.student(request.studentId, session);
        if (['approve', 'accept'].includes(action) && (!student || student.status !== 'ACTIVE' || !same(student.schoolId, request.fromSchoolId) || !same(student.classId, request.fromClassId))) throw new ApiError(409, 'Trường hoặc lớp của học sinh đã thay đổi; hãy hủy yêu cầu và tạo lại');
        if (action === 'approve') {
          request.handover = { name: student.name, code: student.code, dateOfBirth: student.dateOfBirth,
            classHistory: student.classHistory, grades: await repo.grades(student, session), capturedAt: new Date() };
          request.approvedBy = actor._id; request.approvedAt = new Date(); request.status = 'APPROVED';
        } else if (action === 'accept') {
          const school = await repo.school(request.toSchoolId, session);
          const target = await repo.classroom(objectId(data.classId, 'classId'), session);
          if (!school || school.status !== 'ACTIVE' || !target || target.status !== 'ACTIVE' || !same(target.schoolId, school._id) || target.gradeLevel !== request.gradeLevel) throw new ApiError(400, 'Lớp đích phải hoạt động, cùng khối và thuộc trường tiếp nhận');
          const year = await repo.year(target.academicYearId, session);
          const source = await repo.classroom(request.fromClassId, session);
          const sourceYear = source && await repo.year(source.academicYearId, session);
          if (!year || !sourceYear || !same(year.schoolId, school._id) || new Date(year.startDate) > new Date(sourceYear.endDate) || new Date(year.endDate) < new Date(sourceYear.startDate)) throw new ApiError(400, 'Năm học lớp đích không phù hợp với năm học hiện tại');
          if (await repo.countStudents({ schoolId: school._id, classId: target._id }, session) >= target.maxStudents) throw new ApiError(409, 'Lớp đích đã đủ sĩ số');
          const subscription = await repo.subscription(school._id, session);
          const defaults = services.subscription.PLAN_DEFAULTS[subscription?.plan] || services.subscription.PLAN_DEFAULTS.FREE;
          if (await repo.countStudents({ schoolId: school._id }, session) >= (subscription?.maxStudents ?? defaults.maxStudents)) throw new ApiError(409, 'Trường tiếp nhận đã đạt giới hạn học sinh');
          // Refresh on acceptance so grades entered while waiting are included in the handover.
          request.handover = { ...request.handover, grades: await repo.grades(student, session), classHistory: student.classHistory, capturedAt: new Date() };
          const moved = await repo.moveStudent(student, target, school, session);
          if (!moved.matchedCount) throw new ApiError(409, 'Hồ sơ học sinh vừa thay đổi');
          request.toClassId = target._id; request.status = 'ACCEPTED'; request.open = false; request.completedAt = new Date();
        } else {
          request.status = action === 'cancel' ? 'CANCELLED' : 'REJECTED'; request.open = false; request.completedAt = new Date();
        }
        request.history.push(event(action.toUpperCase(), actor, note));
        await request.save({ session });
        const notifications = await notifySchool(request, actor, action, receiving, note, session);
        return { data: { _id: request._id, status: request.status }, notifications };
      });
      // Transaction retries may execute the callback again; publish only the committed result.
      for (const notification of result.notifications) {
        try { dependencies.eventBus.emit('notification.created', notification.toObject()); }
        catch (error) { dependencies.logger.error('[school-transfer] notification.created', error.message); }
      }
      return result.data;
    };
  }
}
module.exports = SchoolTransferService;
