/** Database operations for student-transfer; dependencies are wired in config/container.js. */
class StudentTransferRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  transferUpdateOne(arg1, arg2, arg3) {
    return this.models["user"].updateOne(arg1, arg2, arg3);
  }

  studentFindOne(arg1, arg2) {
    return this.models["user"].findOne(arg1).session(arg2);
  }

  targetFindOne(arg1, arg2) {
    return this.models["class"].findOne(arg1).session(arg2);
  }

  previousFindById(arg1, arg2) {
    return this.models["class"].findById(arg1).session(arg2);
  }

  yearFindOne(arg1, arg2) {
    return this.models["academic-year"].findOne(arg1).session(arg2);
  }

  transferCountDocuments(arg1, arg2) {
    return this.models["user"].countDocuments(arg1).session(arg2);
  }

  gradesFind(arg1, arg2) {
    return this.models["grade"].find(arg1).session(arg2);
  }

  oldClassFindById(arg1, arg2) {
    return this.models["class"].findById(arg1).session(arg2);
  }

  transferSave(document, arg2) {
    return document.save(arg2);
  }

  transferFindOneAndUpdate(arg1, arg2, arg3) {
    return this.models["user"].findOneAndUpdate(arg1, arg2, arg3);
  }
}

module.exports = StudentTransferRepository;
