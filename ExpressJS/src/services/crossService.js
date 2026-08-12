const ApiError = require('../utils/ApiError');
const Message = require('../models/Message');
const CalendarEvent = require('../models/CalendarEvent');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { notifyUserByEmail } = require('./mailService');
const { ROLES } = require('../constants/roles');
const XLSX = require('xlsx');
const Grade = require('../models/Grade');
const FeeInvoice = require('../models/FeeInvoice');
const Attendance = require('../models/Attendance');

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
  const receiver = await User.findById(data.receiverId);
  if (!receiver) throw new ApiError(404, 'Không tìm thấy người nhận');

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
    meta: { messageId: msg._id },
  });

  notifyUserByEmail(receiver, {
    title: 'Tin nhắn mới trên School MS',
    message: `${actor.name} đã gửi: ${data.subject || data.body}`,
  }).catch(() => {});

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
  const filter = {};
  if (actor.schoolId) filter.schoolId = actor.schoolId;
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
  return CalendarEvent.create({
    schoolId: actor.schoolId || null,
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
  const ev = await CalendarEvent.findById(id);
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
  const filter = {};
  if (actor.schoolId) filter.schoolId = actor.schoolId;
  if (query.classId) filter.classId = query.classId;
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

const exportFeesExcel = async (actor) => {
  const filter = {};
  if (actor.schoolId) filter.schoolId = actor.schoolId;
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
  const filter = {};
  if (actor.schoolId) filter.schoolId = actor.schoolId;
  if (query.classId) filter.classId = query.classId;
  const list = await Attendance.find(filter)
    .populate('classId', 'name')
    .populate('records.studentId', 'name code')
    .limit(200);

  const rows = [];
  for (const a of list) {
    for (const r of a.records || []) {
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
  if (actor.schoolId) userFilter.schoolId = actor.schoolId;
  if (actor.role === ROLES.CLUSTER_ADMIN) userFilter.clusterId = actor.clusterId;

  const Class = require('../models/Class');
  const classFilter = { name: regex };
  if (actor.schoolId) classFilter.schoolId = actor.schoolId;

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
