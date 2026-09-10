const ApiError = require('../utils/ApiError');
const Message = require('../models/Message');
const CalendarEvent = require('../models/CalendarEvent');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { ROLES } = require('../constants/roles');
const XLSX = require('xlsx');
const Grade = require('../models/Grade');
const FeeInvoice = require('../models/FeeInvoice');
const Attendance = require('../models/Attendance');
const { buildExportScope } = require('./exportScopeService');
const { schoolScope, objectId } = require('./dataScope');
const { scopedDocument, academicReferences, targetSchool } = require('./writeScope');
const { classAudienceScope, roleAudienceScope } = require('./audienceScope');

// ——— Messaging ———
const listMessages = async (actor, query = {}) => {
  const box = query.box === 'sent' ? 'sent' : 'inbox';
  const filter =
    box === 'sent' ? { senderId: actor._id } : { receiverId: actor._id };
  return Message.find(filter)
    .populate('senderId', 'name email role')
    .populate('receiverId', 'name email role')
    .sort({ createdAt: -1 })
    .limit(100);
};

const sendMessage = async (actor, data) => {
  if (!data.receiverId || !data.body) {
    throw new ApiError(400, 'Thiếu người nhận hoặc nội dung');
  }
  const emailRunAt = require('./jobService').scheduleDate(data.emailRunAt);
  const receiver = await User.findById(objectId(data.receiverId, 'receiverId'));
  if (!receiver) throw new ApiError(404, 'Không tìm thấy người nhận');
  if (actor.role !== ROLES.SUPER_ADMIN && receiver.role !== ROLES.SUPER_ADMIN) {
    const scope = await schoolScope(actor);
    const inScope = actor.role === ROLES.CLUSTER_ADMIN
      ? (receiver.role === ROLES.CLUSTER_ADMIN && String(receiver.clusterId) === String(actor.clusterId)) || scope.schoolId.$in.some(s => String(s) === String(receiver.schoolId))
      : String(receiver.schoolId) === String(actor.schoolId) || (receiver.role === ROLES.CLUSTER_ADMIN && actor.clusterId && String(receiver.clusterId) === String(actor.clusterId));
    if (!inScope) throw new ApiError(403, 'Người nhận ngoài phạm vi liên lạc');
  }
  if (data.parentMessageId) {
    const parent = await Message.findOne({ _id: objectId(data.parentMessageId, 'parentMessageId'), $or: [
      { senderId: actor._id, receiverId: receiver._id },
      { senderId: receiver._id, receiverId: actor._id },
    ] });
    if (!parent) throw new ApiError(403, 'Tin nhắn gốc không thuộc cuộc hội thoại');
  }

  const msg = await Message.create({
    schoolId: actor.schoolId || receiver.schoolId || null,
    senderId: actor._id,
    receiverId: data.receiverId,
    subject: data.subject || '',
    body: data.body,
    parentMessageId: data.parentMessageId || null,
  });

  await Notification.create({
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
  const msg = await Message.findById(id);
  if (!msg) throw new ApiError(404, 'Không tìm thấy tin nhắn');
  if (String(msg.receiverId) !== String(actor._id)) {
    throw new ApiError(403, 'Không có quyền');
  }
  msg.isRead = true;
  await msg.save();
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
  return CalendarEvent.find(filter)
    .populate('createdBy', 'name')
    .populate('classId', 'name')
    .sort({ startAt: 1 })
    .limit(200);
};

const createEvent = async (actor, data) => {
  if (!data.title || !data.startAt || !data.endAt) {
    throw new ApiError(400, 'Thiếu title/startAt/endAt');
  }
  if (!Number.isFinite(new Date(data.startAt).getTime()) || !Number.isFinite(new Date(data.endAt).getTime()) || new Date(data.startAt) > new Date(data.endAt)) throw new ApiError(400, 'Thời gian sự kiện không hợp lệ');
  const schoolId = await targetSchool(actor, data.schoolId);
  if (data.classId) await academicReferences(actor, data, { homeroomAllowed: true, expectedSchoolId: schoolId });
  return CalendarEvent.create({
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
  await ev.deleteOne();
  return true;
};

// ——— Export Excel ———
const exportGradesExcel = async (actor, query = {}) => {
  const { filter } = await buildExportScope(actor, 'grades', query);
  const grades = await Grade.find(filter)
    .populate('studentId', 'name code')
    .populate('subjectId', 'name code')
    .populate('classId', 'name')
    .limit(1000);

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
  const fees = await FeeInvoice.find(filter).populate('studentId', 'name code').limit(1000);
  const rows = fees.map((f) => ({
    HocSinh: f.studentId?.name,
    MaHS: f.studentId?.code,
    NoiDung: f.title,
    SoTien: f.amount,
    DaThu: f.paidAmount,
    TrangThai: f.status,
    Han: f.dueDate,
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'HocPhi');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

const exportAttendanceExcel = async (actor, query = {}) => {
  const { filter, studentIds } = await buildExportScope(actor, 'attendance', query);
  const allowedStudents = studentIds === null ? null : new Set(studentIds.map(String));
  const list = await Attendance.find(filter)
    .populate('classId', 'name')
    .populate('records.studentId', 'name code')
    .limit(200);

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

  const Class = require('../models/Class');
  const classFilter = { name: regex, ...await schoolScope(actor) };

  const [users, classes] = await Promise.all([
    User.find(userFilter).select('name email role code').limit(20),
    Class.find(classFilter).select('name gradeLevel').limit(10),
  ]);
  return { users, classes };
};

module.exports = {
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
