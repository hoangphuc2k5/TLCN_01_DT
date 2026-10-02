function createTenantService(dependencies) {
  const persistence = dependencies.persistence;
  const ApiError = require("../../utils/common/api-error.util");
  const { clusterRepo, schoolRepo } = dependencies.repositories["shared"];
  const { ROLES } = require("../../config/constants/roles.config");
  const { pick } = dependencies.services["write-scope"];
  const { objectId } = dependencies.services["data-scope"];
  
  const listClusters = async (actor, query = {}) => {
    const filter = {};
    if (actor.role !== ROLES.SUPER_ADMIN) {
      filter._id = actor.clusterId;
    }
    if (query.q) filter.name = new RegExp(query.q, 'i');
    return persistence.listClustersFind(filter);
  };
  
  const createCluster = async (data) => {
    if (!data.name || !data.code) throw new ApiError(400, 'Thiếu name/code');
    return persistence.createClusterCreate(data);
  };
  
  const updateCluster = async (id, data) => {
    const allowed = {};
    for (const key of ['name', 'description', 'status']) {
      if (data[key] !== undefined) allowed[key] = data[key];
    }
    const cluster = await persistence.clusterUpdateById(id, allowed);
    if (!cluster) throw new ApiError(404, 'Không tìm thấy cụm');
    return cluster;
  };
  
  const deleteCluster = async (id) => {
    const schoolCount = await persistence.schoolCountCountDocuments({ clusterId: id });
    if (schoolCount > 0) {
      throw new ApiError(400, 'Không thể xóa cụm còn trường thành viên');
    }
    await persistence.deleteClusterDeleteById(id);
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
    return persistence.listSchoolsFind(filter, { populate: 'clusterId', limit: 100 });
  };
  
  const createSchool = async (actor, data) => {
    if (!data.name || !data.code || !data.subdomain) {
      throw new ApiError(400, 'Thiếu name/code/subdomain');
    }
    let clusterId = data.clusterId || null;
    if (actor.role === ROLES.CLUSTER_ADMIN) {
      clusterId = actor.clusterId;
    }
    if (clusterId && !(await persistence.createSchoolFindById(objectId(clusterId)))) throw new ApiError(400, 'Cụm không tồn tại');
    return persistence.createSchoolCreate({ ...pick(data, ['name', 'code', 'subdomain', 'address', 'phone', 'email', 'logo', 'schoolType', 'status']), clusterId });
  };
  
    const updateSchool = async (actor, id, data) => {
    const school = await persistence.schoolFindById(id);
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
  
    const updated = await persistence.updatedUpdateById(id, allowed);
    return persistence.updateSchoolFindById(updated._id);
  };
  
  const deleteSchool = async (id) => {
    await persistence.deleteSchoolDeleteById(id);
    return true;
  };
  
  return {
    listClusters,
    createCluster,
    updateCluster,
    deleteCluster,
    listSchools,
    createSchool,
    updateSchool,
    deleteSchool,
  };
  
}

class TenantService {
  constructor(dependencies) {
    Object.assign(this, createTenantService(dependencies));
  }
}

module.exports = TenantService;
