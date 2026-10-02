/** Database operations for data-scope; dependencies are wired in config/container.js. */
class DataScopeRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  schoolsFind(arg1) {
    return this.models["school"].find(arg1).select('_id');
  }

  usersFind(arg1) {
    return this.models["user"].find(arg1).select('_id');
  }

  assignmentsFind(arg1) {
    return this.models["teacher-assignment"].find(arg1).lean();
  }

  homeClassesFind(arg1) {
    return this.models["class"].find(arg1).lean();
  }
}

module.exports = DataScopeRepository;
