const ApiError = require('../utils/ApiError');
const AuditLog = require('../models/AuditLog');
const SupportTicket = require('../models/SupportTicket');
const ConductRecord = require('../models/ConductRecord');
const SharedTemplate = require('../models/SharedTemplate');
const School = require('../models/School');
const { ROLES } = require('../constants/roles');

// Audit
const listAuditLogs = async (actor, query = {}) => {
  const filter = {};
  if (actor.role === ROLES.SUPER_ADMIN) {
    if (query.schoolId) filter.schoolId = query.schoolId;
  } else {
    filter.schoolId = actor.schoolId;
  }
  if (query.action) filter.action = query.action;
  if (query.resource) filter.resource = query.resource;
  return AuditLog.find(filter)
    .populate('actorId', 'name email role')
    .sort({ createdAt: -1 })
    .limit(Number(query.limit) || 100);
};

// Support
const listTickets = async (actor, query = {}) => {
  const filter = {};
  if (actor.role === ROLES.SUPER_ADMIN) {
    if (query.status) filter.status = query.status;
  } else if (actor.role === ROLES.CLUSTER_ADMIN) {
    filter.clusterId = actor.clusterId;
  } else {
    filter.schoolId = actor.schoolId;
  }
  if (query.status) filter.status = query.status;
  return SupportTicket.find(filter)
    .populate('createdBy', 'name email')
    .populate('schoolId', 'name')
    .populate('assignedTo', 'name')
    .sort({ createdAt: -1 });
};

const createTicket = async (actor, data) => {
  if (!data.title || !data.description) throw new ApiError(400, 'Thiếu title/description');
  return SupportTicket.create({
    schoolId: actor.schoolId || null,
    clusterId: actor.clusterId || null,
    createdBy: actor._id,
    title: data.title,
    description: data.description,
    category: data.category || 'TECHNICAL',
    priority: data.priority || 'MEDIUM',
  });
};

const updateTicket = async (actor, id, data) => {
  const ticket = await SupportTicket.findById(id);
  if (!ticket) throw new ApiError(404, 'Không tìm thấy ticket');
  if (actor.role !== ROLES.SUPER_ADMIN && String(ticket.schoolId) !== String(actor.schoolId)) {
    throw new ApiError(403, 'Ngoài phạm vi');
  }
  const allowed = ['status', 'priority', 'resolution', 'assignedTo', 'category'];
  for (const key of allowed) {
    if (data[key] !== undefined) ticket[key] = data[key];
  }
  if (actor.role === ROLES.SUPER_ADMIN && !ticket.assignedTo) {
    ticket.assignedTo = actor._id;
  }
  await ticket.save();
  return ticket;
};

// Conduct
const listConduct = async (actor, query = {}) => {
  const filter = {};
  if (actor.schoolId) filter.schoolId = actor.schoolId;
  if (query.studentId) filter.studentId = query.studentId;
  if (query.semester) filter.semester = Number(query.semester);
  if (actor.role === ROLES.STUDENT) filter.studentId = actor._id;
  if (actor.role === ROLES.PARENT) filter.studentId = { $in: actor.parentOf || [] };
  return ConductRecord.find(filter)
    .populate('studentId', 'name code')
    .populate('classId', 'name')
    .populate('recordedBy', 'name')
    .populate('academicYearId', 'name')
    .sort({ updatedAt: -1 });
};

const upsertConduct = async (actor, data) => {
  if (!data.studentId || !data.academicYearId || !data.rating) {
    throw new ApiError(400, 'Thiếu studentId/academicYearId/rating');
  }
  const filter = {
    schoolId: actor.schoolId,
    studentId: data.studentId,
    academicYearId: data.academicYearId,
    semester: data.semester || 1,
  };
  return ConductRecord.findOneAndUpdate(
    filter,
    {
      ...filter,
      classId: data.classId || null,
      rating: data.rating,
      comment: data.comment || '',
      recordedBy: actor._id,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

// Templates
const listTemplates = async (actor, query = {}) => {
  const or = [{ scope: 'SYSTEM', isActive: true }];
  if (actor.clusterId) or.push({ scope: 'CLUSTER', clusterId: actor.clusterId, isActive: true });
  if (actor.role === ROLES.SUPER_ADMIN) {
    return SharedTemplate.find(query.type ? { type: query.type } : {})
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
  }
  const filter = { $or: or };
  if (query.type) filter.type = query.type;
  return SharedTemplate.find(filter).populate('createdBy', 'name').sort({ createdAt: -1 });
};

const createTemplate = async (actor, data) => {
  if (!data.name || !data.type) throw new ApiError(400, 'Thiếu name/type');
  let scope = 'SYSTEM';
  let clusterId = null;
  if (actor.role === ROLES.CLUSTER_ADMIN) {
    scope = 'CLUSTER';
    clusterId = actor.clusterId;
  } else if (actor.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Không có quyền tạo mẫu');
  }
  return SharedTemplate.create({
    name: data.name,
    type: data.type,
    scope,
    clusterId,
    content: data.content || '',
    version: data.version || '1.0',
    createdBy: actor._id,
    isActive: true,
  });
};

const updateTemplate = async (actor, id, data) => {
  const tpl = await SharedTemplate.findById(id);
  if (!tpl) throw new ApiError(404, 'Không tìm thấy mẫu');
  if (actor.role === ROLES.CLUSTER_ADMIN && String(tpl.clusterId) !== String(actor.clusterId)) {
    throw new ApiError(403, 'Ngoài phạm vi');
  }
  ['name', 'content', 'version', 'isActive', 'type'].forEach((k) => {
    if (data[k] !== undefined) tpl[k] = data[k];
  });
  await tpl.save();
  return tpl;
};

const applyTemplateToSchool = async (actor, schoolId, templateId) => {
  const school = await School.findById(schoolId);
  if (!school) throw new ApiError(404, 'Không tìm thấy trường');
  if (actor.role === ROLES.SCHOOL_ADMIN && String(school._id) !== String(actor.schoolId)) {
    throw new ApiError(403, 'Ngoài phạm vi');
  }
  if (actor.role === ROLES.CLUSTER_ADMIN && String(school.clusterId) !== String(actor.clusterId)) {
    throw new ApiError(403, 'Ngoài phạm vi cụm');
  }
  const ids = new Set((school.appliedTemplateIds || []).map(String));
  ids.add(String(templateId));
  school.appliedTemplateIds = [...ids];
  await school.save();
  return school.populate('appliedTemplateIds');
};

module.exports = {
  listAuditLogs,
  listTickets,
  createTicket,
  updateTicket,
  listConduct,
  upsertConduct,
  listTemplates,
  createTemplate,
  updateTemplate,
  applyTemplateToSchool,
};
