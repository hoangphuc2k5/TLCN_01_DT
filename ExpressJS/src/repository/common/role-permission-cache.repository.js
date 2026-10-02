/** Database operations for role-permission-cache; dependencies are wired in config/container.js. */
class RolePermissionCacheRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  rolesFind(arg1) {
    return this.models["role"].find(arg1).lean();
  }
}

module.exports = RolePermissionCacheRepository;
