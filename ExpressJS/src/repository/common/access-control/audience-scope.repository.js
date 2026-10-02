/** Database operations for audience-scope; dependencies are wired in config/container.js. */
class AudienceScopeRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  studentsFind(arg1) {
    return this.models["user"].find(arg1).select('classId');
  }
}

module.exports = AudienceScopeRepository;
