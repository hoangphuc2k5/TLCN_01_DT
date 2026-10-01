function createCrossService(dependencies) {
  const persistence = dependencies.persistence;
  const ApiError = require("../../utils/common/api-error.util");
  const CalendarEvent = "calendar-event";
  const { ROLES } = require("../../config/constants/roles.config");
  const XLSX = require('xlsx');
  const { buildExportScope } = dependencies.services["export-scope"];
  const { schoolScope, objectId } = dependencies.services["data-scope"];
  const { scopedDocument, academicReferences, targetSchool } = dependencies.services["write-scope"];
  const { classAudienceScope, roleAudienceScope } = dependencies.services["audience-scope"];
  
  // ——— Messaging ———
  const listMessages = async (actor, query = {}) => {
    const box = query.box === 'sent' ? 'sent' : 'inbox';
    const filter =
      box === 'sent' ? { senderId: actor._id } : { receiverId: actor._id };
    return persistence.listMessagesFind(filter, { createdAt: -1 });
  };
  
  const sendMessage = async (actor, data) => {
    if (!data.receiverId || !data.body) {
      throw new ApiError(400, 'Thiếu người nhận hoặc nội dung');
    }
    const emailRunAt = dependencies.services["job"].scheduleDate(data.emailRunAt);
    const receiver = await persistence.receiverFindById(objectId(data.receiverId, 'receiverId'));
    if (!receiver) throw new ApiError(404, 'Không tìm thấy người nhận');
    if (actor.role !== ROLES.SUPER_ADMIN && receiver.role !== ROLES.SUPER_ADMIN) {
      const scope = await schoolScope(actor);
      const inScope = actor.role === ROLES.CLUSTER_ADMIN
        ? (receiver.role === ROLES.CLUSTER_ADMIN && String(receiver.clusterId) === String(actor.clusterId)) || scope.schoolId.$in.some(s => String(s) === String(receiver.schoolId))
        : String(receiver.schoolId) === String(actor.schoolId) || (receiver.role === ROLES.CLUSTER_ADMIN && actor.clusterId && String(receiver.clusterId) === String(actor.clusterId));
      if (!inScope) throw new ApiError(403, 'Người nhận ngoài phạm vi liên lạc');
    }
    if (data.parentMessageId) {
      const parent = await persistence.parentFindOne({ _id: objectId(data.parentMessageId, 'parentMessageId'), $or: [
        { senderId: actor._id, receiverId: receiver._id },
        { senderId: receiver._id, receiverId: actor._id },
      ] });
      if (!parent) throw new ApiError(403, 'Tin nhắn gốc không thuộc cuộc hội thoại');
    }
  
    const msg = await persistence.msgCreate({
      schoolId: actor.schoolId || receiver.schoolId || null,
      senderId: actor._id,
      receiverId: data.receiverId,
      subject: data.subject || '',
      body: data.body,
      parentMessageId: data.parentMessageId || null,
    });
  
    await persistence.sendMessageCreate({
      userId: receiver._id,
      schoolId: msg.schoolId,
      title: 'Tin nhắn mới',
      message: `${actor.name}: ${(data.subject || data.body).slice(0, 80)}`,
      type: 'MESSAGE',
      emailState: 'PENDING',
      emailRunAt,
      meta: { messageId: msg._id },
    });
  
    return msg;
  };
  
  const markMessageRead = async (actor, id) => {
    const msg = await persistence.msgFindById(id);
    if (!msg) throw new ApiError(404, 'Không tìm thấy tin nhắn');
    if (String(msg.receiverId) !== String(actor._id)) {
      throw new ApiError(403, 'Không có quyền');
    }
    msg.isRead = true;
    await persistence.markMessageReadSave(msg);
    return msg;
  };
  
  // ——— Calendar ———
  const listEvents = async (actor, query = {}) => {
    const filter = { $and: [await schoolScope(actor), await classAudienceScope(actor), roleAudienceScope(actor)] };
    if (query.from || query.to) {
      filter.startAt = {};
      if (query.from) filter.startAt.$gte = new Date(query.from);
      if (query.to) filter.startAt.$lte = new Date(query.to);
    }
    return persistence.listEventsFind(filter, { startAt: 1 });
  };
  
  const createEvent = async (actor, data) => {
    if (!data.title || !data.startAt || !data.endAt) {
      throw new ApiError(400, 'Thiếu title/startAt/endAt');
    }
    if (!Number.isFinite(new Date(data.startAt).getTime()) || !Number.isFinite(new Date(data.endAt).getTime()) || new Date(data.startAt) > new Date(data.endAt)) throw new ApiError(400, 'Thời gian sự kiện không hợp lệ');
    const schoolId = await targetSchool(actor, data.schoolId);
    if (data.classId) await academicReferences(actor, data, { homeroomAllowed: true, expectedSchoolId: schoolId });
    return persistence.createEventCreate({
      schoolId,
      title: data.title,
      description: data.description || '',
      type: data.type || 'EVENT',
      startAt: data.startAt,
      endAt: data.endAt,
      classId: data.classId || null,
      createdBy: actor._id,
      targetRoles: data.targetRoles || [],
    });
  };
  
  const deleteEvent = async (actor, id) => {
    const ev = await scopedDocument(CalendarEvent, actor, id);
    if (!ev) throw new ApiError(404, 'Không tìm thấy sự kiện');
    if (
      String(ev.createdBy) !== String(actor._id) &&
      ![ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN, ROLES.ACADEMIC_AFFAIRS].includes(actor.role)
    ) {
      throw new ApiError(403, 'Không có quyền xóa');
    }
    await persistence.deleteEventDeleteOne(ev);
    return true;
  };
  
  // ——— Export Excel ———
  const exportGradesExcel = async (actor, query = {}) => {
    const { filter } = await buildExportScope(actor, 'grades', query);
    const grades = await persistence.gradesFind(filter);
  
    const rows = grades.map((g) => ({
      HocSinh: g.studentId?.name,
      MaHS: g.studentId?.code,
      Lop: g.classId?.name,
      Mon: g.subjectId?.name,
      HocKy: g.semester,
      DiemTB: g.average,
      XepLoai: g.classification,
    }));
  
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'BangDiem');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  };
  
  const exportFeesExcel = async (actor, query = {}) => {
    const { filter } = await buildExportScope(actor, 'fees', query);
    const fees = await persistence.feesFind(filter);
    const rows = fees.flatMap((f) => {
      const common = {
        HocSinh: f.studentId?.name,
        MaHS: f.studentId?.code,
        HoaDon: f.title,
        TongHoaDon: f.amount,
        TongDaThu: f.paidAmount,
        TrangThaiHoaDon: f.status,
        Han: f.dueDate,
      };
      if (!f.lineItems?.length) {
        return [{
          ...common,
          MaKhoan: '',
          KhoanThu: f.title,
          Loai: f.category,
          SoLuong: 1,
          DonGia: f.amount,
          ThanhTien: f.amount,
          DaThuTheoKhoan: f.paidAmount,
        }];
      }
      return f.lineItems.map(item => ({
        ...common,
        MaKhoan: item.code,
        KhoanThu: item.name,
        Loai: item.category,
        SoLuong: item.quantity,
        DonGia: item.unitAmount,
        ThanhTien: item.amount,
        DaThuTheoKhoan: item.paidAmount,
      }));
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'HocPhi');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  };
  
  const exportAttendanceExcel = async (actor, query = {}) => {
    const { filter, studentIds } = await buildExportScope(actor, 'attendance', query);
    const allowedStudents = studentIds === null ? null : new Set(studentIds.map(String));
    const list = await persistence.listFind(filter);
  
    const rows = [];
    for (const a of list) {
      for (const r of a.records || []) {
        if (allowedStudents && !allowedStudents.has(String(r.studentId?._id))) continue;
        rows.push({
          Ngay: a.date,
          Tiet: a.period,
          Lop: a.classId?.name,
          HocSinh: r.studentId?.name,
          MaHS: r.studentId?.code,
          TrangThai: r.status,
          GhiChu: r.note,
        });
      }
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'DiemDanh');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  };
  
  // ——— Global search ———
  const globalSearch = async (actor, q) => {
    if (!q || q.length < 2) return { users: [], classes: [] };
    const regex = new RegExp(q, 'i');
    const userFilter = {
      $or: [{ name: regex }, { email: regex }, { code: regex }],
    };
    Object.assign(userFilter, await schoolScope(actor));
    const classFilter = { name: regex, ...await schoolScope(actor) };
  
    const [users, classes] = await Promise.all([
      persistence.globalSearchFind(userFilter),
      persistence.globalSearchFind2(classFilter),
    ]);
    return { users, classes };
  };
  
  return {
    listMessages,
    sendMessage,
    markMessageRead,
    listEvents,
    createEvent,
    deleteEvent,
    exportGradesExcel,
    exportFeesExcel,
    exportAttendanceExcel,
    globalSearch,
  };
  
}

class CrossService {
  constructor(dependencies) {
    Object.assign(this, createCrossService(dependencies));
  }
}

module.exports = CrossService;
