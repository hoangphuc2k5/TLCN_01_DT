const ApiError = require('../utils/ApiError');
const { announcementRepo } = require('../repositories');
const eventBus = require('../patterns/eventBus');
const User = require('../models/User');
const { ROLES } = require('../constants/roles');
const { ANNOUNCEMENT_SCOPE } = require('../constants/status');
const { academicReferences, targetSchool } = require('./writeScope');
const { objectId, schoolScope } = require('./dataScope');
const { classAudienceScope, roleAudienceScope } = require('./audienceScope');
const School = require('../models/School');
const Cluster = require('../models/Cluster');

const listAnnouncements = async (actor, query = {}) => {
  const or = [];
  if (actor.role === ROLES.SUPER_ADMIN) {
    // all
  } else if (actor.role === ROLES.CLUSTER_ADMIN) {
    or.push({ scope: ANNOUNCEMENT_SCOPE.SYSTEM });
    or.push({ scope: ANNOUNCEMENT_SCOPE.CLUSTER, clusterId: actor.clusterId });
    or.push({ scope: { $in: [ANNOUNCEMENT_SCOPE.SCHOOL, ANNOUNCEMENT_SCOPE.CLASS] }, ...await schoolScope(actor) });
  } else {
    or.push({ scope: ANNOUNCEMENT_SCOPE.SYSTEM });
    const school = await School.findById(actor.schoolId).select('clusterId');
    if (school?.clusterId) or.push({ scope: ANNOUNCEMENT_SCOPE.CLUSTER, clusterId: school.clusterId });
    or.push({ scope: ANNOUNCEMENT_SCOPE.SCHOOL, schoolId: actor.schoolId });
    or.push({ scope: ANNOUNCEMENT_SCOPE.CLASS, schoolId: actor.schoolId, ...await classAudienceScope(actor) });
  }

  const filter = { $and: [or.length ? { $or: or } : {}, roleAudienceScope(actor)] };
  if (query.scope) filter.scope = query.scope;

  return announcementRepo.find(filter, {
    populate: 'createdBy schoolId classId',
    limit: 50,
  });
};

const createAnnouncement = async (actor, data) => {
  if (!data.title || !data.content) throw new ApiError(400, 'Thiếu title/content');

  let scope = data.scope || ANNOUNCEMENT_SCOPE.SCHOOL;
  if (actor.role === ROLES.SUPER_ADMIN) {
    scope = data.scope || ANNOUNCEMENT_SCOPE.SYSTEM;
  } else if (actor.role === ROLES.CLUSTER_ADMIN) {
    scope = ANNOUNCEMENT_SCOPE.CLUSTER;
  } else if ([ROLES.HOMEROOM_TEACHER, ROLES.SUBJECT_TEACHER].includes(actor.role) && data.classId) {
    scope = ANNOUNCEMENT_SCOPE.CLASS;
  } else {
    scope = ANNOUNCEMENT_SCOPE.SCHOOL;
  }

  let schoolId = null, clusterId = null;
  if ([ANNOUNCEMENT_SCOPE.SCHOOL, ANNOUNCEMENT_SCOPE.CLASS].includes(scope)) {
    schoolId = await targetSchool(actor, actor.schoolId || data.schoolId);
    clusterId = (await School.findById(schoolId)).clusterId;
    if (scope === ANNOUNCEMENT_SCOPE.CLASS && !data.classId) throw new ApiError(400, 'Thông báo lớp cần classId');
    if (data.classId) await academicReferences(actor, data, { homeroomAllowed: true, expectedSchoolId: schoolId });
  } else if (scope === ANNOUNCEMENT_SCOPE.CLUSTER) {
    clusterId = objectId(actor.role === ROLES.CLUSTER_ADMIN ? actor.clusterId : data.clusterId, 'clusterId');
    if (!(await Cluster.exists({ _id: clusterId }))) throw new ApiError(400, 'Cụm không tồn tại');
  }
  const announcement = await announcementRepo.create({
    title: data.title,
    content: data.content,
    scope,
    schoolId,
    clusterId,
    classId: scope === ANNOUNCEMENT_SCOPE.CLASS ? data.classId : null,
    createdBy: actor._id,
    targetRoles: data.targetRoles || [],
    isPinned: !!data.isPinned,
  });

  // Apply the same class/role audience before emitting content to notification/email listeners.
  let recipients = [];
  const recipientFilter = { schoolId: announcement.schoolId, ...(announcement.targetRoles.length ? { role: { $in: announcement.targetRoles } } : {}) };
  if (scope === ANNOUNCEMENT_SCOPE.SCHOOL && announcement.schoolId) {
    const users = await User.find(recipientFilter).select('_id');
    recipients = users.map((u) => u._id);
  } else if (scope === ANNOUNCEMENT_SCOPE.CLASS && announcement.classId) {
    const students = await User.find({ schoolId: announcement.schoolId, classId: announcement.classId, role: ROLES.STUDENT }).select('_id');
    const assignments = await require('../models/TeacherAssignment').find({ schoolId: announcement.schoolId, classId: announcement.classId }).select('teacherId');
    const cls = await require('../models/Class').findById(announcement.classId).select('homeroomTeacherId');
    const users = await User.find({ ...recipientFilter, $or: [
      { role: ROLES.STUDENT, _id: { $in: students.map(s => s._id) } },
      { role: ROLES.PARENT, parentOf: { $in: students.map(s => s._id) } },
      { role: { $in: [ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER] }, _id: { $in: [...assignments.map(a => a.teacherId), cls?.homeroomTeacherId].filter(Boolean) } },
    ] }).select('_id');
    recipients = users.map((u) => u._id);
  }

  eventBus.emit('announcement.created', { announcement, recipients });
  return announcement;
};

const deleteAnnouncement = async (actor, id) => {
  const item = await announcementRepo.findById(id);
  if (!item) throw new ApiError(404, 'Không tìm thấy thông báo');
  const inScope = actor.role === ROLES.SUPER_ADMIN ||
    (actor.role === ROLES.CLUSTER_ADMIN && item.clusterId && String(item.clusterId) === String(actor.clusterId)) ||
    (actor.schoolId && item.schoolId && String(item.schoolId) === String(actor.schoolId));
  if (!inScope) {
    throw new ApiError(403, 'Không có quyền xóa');
  }
  await announcementRepo.deleteById(id);
  return true;
};

module.exports = { listAnnouncements, createAnnouncement, deleteAnnouncement };
