/** Database operations for role; dependencies are wired in config/container.js. */
class RoleRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  rolesFind(arg1, arg2) {
    return this.models["role"].find(arg1).sort(arg2).lean();
  }

  rolesFind2(arg1, arg2) {
    return this.models["role"].find(arg1).sort(arg2).lean();
  }

  createRoleFindOne(arg1) {
    return this.models["role"].findOne(arg1);
  }

  roleCreate(arg1) {
    return this.models["role"].create(arg1);
  }

  roleFindById(arg1) {
    return this.models["role"].findById(arg1);
  }

  updateRoleSave(document) {
    return document.save();
  }

  roleFindById2(arg1) {
    return this.models["role"].findById(arg1);
  }

  inUseCountDocuments(arg1) {
    return this.models["user"].countDocuments(arg1);
  }

  deleteRoleFindByIdAndDelete(arg1) {
    return this.models["role"].findByIdAndDelete(arg1);
  }

  existingFindOne(arg1) {
    return this.models["role"].findOne(arg1);
  }

  seedSystemRolesSave(document) {
    return document.save();
  }

  seedSystemRolesFindOneAndUpdate(arg1, arg2, arg3) {
    return this.models["role"].findOneAndUpdate(arg1, arg2, arg3);
  }
}

module.exports = RoleRepository;
