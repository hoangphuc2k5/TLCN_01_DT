const ApiError = require('../utils/ApiError');
const { clusterRepo, schoolRepo } = require('../repositories');
const { ROLES } = require('../constants/roles');
const School = require('../models/School');

const listClusters = async (actor, query = {}) => {
  const filter = {};
  if (actor.role === ROLES.CLUSTER_ADMIN) {
    filter._id = actor.clusterId;
  }
  if (query.q) filter.name = new RegExp(query.q, 'i');
  return clusterRepo.find(filter);
};

const createCluster = async (data) => {
  if (!data.name || !data.code) throw new ApiError(400, 'Thiếu name/code');
  return clusterRepo.create(data);
};

const updateCluster = async (id, data) => {
  const allowed = {};
  for (const key of ['name', 'description', 'status']) {
    if (data[key] !== undefined) allowed[key] = data[key];
  }
  const cluster = await clusterRepo.updateById(id, allowed);
  if (!cluster) throw new ApiError(404, 'Không tìm thấy cụm');
  return cluster;
};

const deleteCluster = async (id) => {
  const schoolCount = await School.countDocuments({ clusterId: id });
  if (schoolCount > 0) {
    throw new ApiError(400, 'Không thể xóa cụm còn trường thành viên');
  }
  await clusterRepo.deleteById(id);
  return true;
};

const listSchools = async (actor, query = {}) => {
  const filter = {};
  if (actor.role === ROLES.SUPER_ADMIN) {
    if (query.clusterId) filter.clusterId = query.clusterId;
  } else if (actor.role === ROLES.CLUSTER_ADMIN) {
    filter.clusterId = actor.clusterId;
  } else {
    filter._id = actor.schoolId;
  }
  if (query.q) filter.name = new RegExp(query.q, 'i');
  if (query.status) filter.status = query.status;
  return schoolRepo.find(filter, { populate: 'clusterId', limit: 100 });
};

const createSchool = async (actor, data) => {
  if (!data.name || !data.code || !data.subdomain) {
    throw new ApiError(400, 'Thiếu name/code/subdomain');
  }
  let clusterId = data.clusterId || null;
  if (actor.role === ROLES.CLUSTER_ADMIN) {
    clusterId = actor.clusterId;
  }
  return schoolRepo.create({ ...data, clusterId });
};

  const updateSchool = async (actor, id, data) => {
  const school = await schoolRepo.findById(id);
  if (!school) throw new ApiError(404, 'Không tìm thấy trường');

  if (actor.role === ROLES.CLUSTER_ADMIN && String(school.clusterId) !== String(actor.clusterId)) {
    throw new ApiError(403, 'Ngoài phạm vi cụm');
  }
  if (actor.role === ROLES.SCHOOL_ADMIN && String(school._id) !== String(actor.schoolId)) {
    throw new ApiError(403, 'Ngoài phạm vi trường');
  }

  let allowed;
  if (actor.role === ROLES.SUPER_ADMIN) {
    allowed = {};
    for (const key of [
      'name',
      'code',
      'subdomain',
      'address',
      'phone',
      'email',
      'logo',
      'schoolType',
      'status',
      'clusterId',
    ]) {
      if (data[key] !== undefined) allowed[key] = data[key];
    }
  } else {
    allowed = {
      name: data.name,
      address: data.address,
      phone: data.phone,
      email: data.email,
      logo: data.logo,
      schoolType: data.schoolType,
    };
  }

  const updated = await schoolRepo.updateById(id, allowed);
  return schoolRepo.findById(updated._id, 'clusterId');
};

const deleteSchool = async (id) => {
  await schoolRepo.deleteById(id);
  return true;
};

module.exports = {
  listClusters,
  createCluster,
  updateCluster,
  deleteCluster,
  listSchools,
  createSchool,
  updateSchool,
  deleteSchool,
};
