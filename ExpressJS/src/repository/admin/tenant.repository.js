/** Database operations for tenant; dependencies are wired in config/container.js. */
class TenantRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  listClustersFind(arg1) {
    return this.shared.clusterRepo.find(arg1);
  }

  createClusterCreate(arg1) {
    return this.shared.clusterRepo.create(arg1);
  }

  clusterUpdateById(arg1, arg2) {
    return this.shared.clusterRepo.updateById(arg1, arg2);
  }

  schoolCountCountDocuments(arg1) {
    return this.models["school"].countDocuments(arg1);
  }

  deleteClusterDeleteById(arg1) {
    return this.shared.clusterRepo.deleteById(arg1);
  }

  listSchoolsFind(arg1, arg2) {
    return this.shared.schoolRepo.find(arg1, arg2);
  }

  createSchoolFindById(arg1) {
    return this.shared.clusterRepo.findById(arg1);
  }

  createSchoolCreate(arg1) {
    return this.shared.schoolRepo.create(arg1);
  }

  schoolFindById(arg1) {
    return this.shared.schoolRepo.findById(arg1);
  }

  updatedUpdateById(arg1, arg2) {
    return this.shared.schoolRepo.updateById(arg1, arg2);
  }

  updateSchoolFindById(arg1) {
    return this.shared.schoolRepo.findById(arg1, 'clusterId');
  }

  deleteSchoolDeleteById(arg1) {
    return this.shared.schoolRepo.deleteById(arg1);
  }
}

module.exports = TenantRepository;
