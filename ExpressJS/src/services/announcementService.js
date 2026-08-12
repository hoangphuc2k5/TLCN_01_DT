const ApiError = require('../utils/ApiError');
const { announcementRepo } = require('../repositories');
const eventBus = require('../patterns/eventBus');
const User = require('../models/User');
const { ROLES } = require('../constants/roles');
const { ANNOUNCEMENT_SCOPE } = require('../constants/status');

const listAnnouncements = async (actor, query = {}) => {
  const or = [];
  if (actor.role === ROLES.SUPER_ADMIN) {
    // all
  } else if (actor.role === ROLES.CLUSTER_ADMIN) {
    or.push({ scope: ANNOUNCEMENT_SCOPE.SYSTEM });
    or.push({ scope: ANNOUNCEMENT_SCOPE.CLUSTER, clusterId: actor.clusterId });
  } else {
    or.push({ scope: ANNOUNCEMENT_SCOPE.SYSTEM });
    if (actor.clusterId) or.push({ scope: ANNOUNCEMENT_SCOPE.CLUSTER, clusterId: actor.clusterId });
    or.push({ scope: ANNOUNCEMENT_SCOPE.SCHOOL, schoolId: actor.schoolId });
    if (actor.classId) or.push({ scope: ANNOUNCEMENT_SCOPE.CLASS, classId: actor.classId });
  }

  const filter = or.length ? { $or: or } : {};
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

  const announcement = await announcementRepo.create({
    title: data.title,
    content: data.content,
    scope,
    schoolId: scope === ANNOUNCEMENT_SCOPE.SYSTEM ? null : actor.schoolId || data.schoolId || null,
    clusterId:
      scope === ANNOUNCEMENT_SCOPE.CLUSTER
        ? actor.clusterId
        : data.clusterId || actor.clusterId || null,
    classId: data.classId || null,
    createdBy: actor._id,
    targetRoles: data.targetRoles || [],
    isPinned: !!data.isPinned,
  });

  // notify recipients (simplified)
  let recipients = [];
  if (scope === ANNOUNCEMENT_SCOPE.SCHOOL && announcement.schoolId) {
    const users = await User.find({ schoolId: announcement.schoolId }).select('_id');
    recipients = users.map((u) => u._id);
  } else if (scope === ANNOUNCEMENT_SCOPE.CLASS && announcement.classId) {
    const users = await User.find({ classId: announcement.classId }).select('_id');
    recipients = users.map((u) => u._id);
  }

  eventBus.emit('announcement.created', { announcement, recipients });
  return announcement;
};

const deleteAnnouncement = async (actor, id) => {
  const item = await announcementRepo.findById(id);
  if (!item) throw new ApiError(404, 'Không tìm thấy thông báo');
  if (
    actor.role !== ROLES.SUPER_ADMIN &&
    String(item.createdBy) !== String(actor._id) &&
    String(item.schoolId) !== String(actor.schoolId)
  ) {
    throw new ApiError(403, 'Không có quyền xóa');
  }
  await announcementRepo.deleteById(id);
  return true;
};

module.exports = { listAnnouncements, createAnnouncement, deleteAnnouncement };
