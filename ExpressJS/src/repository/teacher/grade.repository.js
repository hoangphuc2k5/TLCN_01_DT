/** Database operations for grade; dependencies are wired in config/container.js. */
class GradeRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  resultUpdateOne(arg1, arg2, arg3) {
    return this.models["user"].updateOne(arg1, arg2, arg3);
  }

  listGradesFind(arg1, arg2) {
    return this.shared.gradeRepo.find(arg1, arg2);
  }

  existingFindOne(arg1, arg2) {
    return this.models["grade"].findOne(arg1).session(arg2);
  }

  updatedFindOneAndUpdate(arg1, arg2, arg3) {
    return this.models["grade"].findOneAndUpdate(arg1, arg2, arg3);
  }

  writeGradeFindOne(arg1, arg2) {
    return this.models["grade"].findOne(arg1).session(arg2);
  }

  studentFindById(arg1, arg2) {
    return this.models["user"].findById(arg1).session(arg2);
  }

  writeGradeCreate(arg1, arg2) {
    return this.models["grade"].create(arg1, arg2);
  }

  initialFindById(arg1) {
    return this.shared.gradeRepo.findById(arg1);
  }

  gradeFindById(arg1, arg2) {
    return this.models["grade"].findById(arg1).session(arg2);
  }

  updatedFindOneAndUpdate2(arg1, arg2, arg3) {
    return this.models["grade"].findOneAndUpdate(arg1, arg2, arg3);
  }

  withStudentLockTransaction(arg1) {
    return this.database.connection.transaction(arg1);
  }
}

module.exports = GradeRepository;
