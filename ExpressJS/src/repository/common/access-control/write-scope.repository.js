/** Database operations for write-scope; dependencies are wired in config/container.js. */
class WriteScopeRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  targetSchoolExists(arg1) {
    return this.models["school"].exists(arg1);
  }

  teachingExists(arg1) {
    return this.models["teacher-assignment"].exists(arg1);
  }

  findOne(model, filter) {
    return this.models[model].findOne(filter);
  }
}

module.exports = WriteScopeRepository;
