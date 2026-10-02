/** Database operations for import; dependencies are wired in config/container.js. */
class ImportRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  findClassByNameFindOne(arg1) {
    return this.models["class"].findOne(arg1);
  }

  findStudentByCodeFindOne(arg1) {
    return this.models["user"].findOne(arg1);
  }

  byNameFindOne(arg1) {
    return this.models["academic-year"].findOne(arg1);
  }

  currentFindOne(arg1) {
    return this.models["academic-year"].findOne(arg1);
  }

  findYearByNameFindOne(arg1, arg2) {
    return this.models["academic-year"].findOne(arg1).sort(arg2);
  }

  subjectFindOne(arg1) {
    return this.models["subject"].findOne(arg1);
  }

  subjectFindOne2(arg1) {
    return this.models["subject"].findOne(arg1);
  }
}

module.exports = ImportRepository;
