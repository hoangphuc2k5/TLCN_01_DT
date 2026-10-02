/** Database operations for leave; dependencies are wired in config/container.js. */
class LeaveRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  classesFind(arg1) {
    return this.models["class"].find(arg1).select('_id');
  }

  homeroomStudentIdsFind(arg1) {
    return this.models["user"].find(arg1).select('_id');
  }

  listLeavesFind(arg1, arg2) {
    return this.shared.leaveRepo.find(arg1, arg2);
  }

  createLeaveExists(arg1) {
    return this.models["user"].exists(arg1);
  }

  createLeaveCreate(arg1) {
    return this.shared.leaveRepo.create(arg1);
  }

  leaveFindOne(arg1) {
    return this.shared.leaveRepo.findOne(arg1);
  }

  currentFindOne(arg1, arg2) {
    return this.models["leave-request"].findOne(arg1).session(arg2);
  }

  resultFindOneAndUpdate(arg1, arg2, arg3) {
    return this.models["leave-request"].findOneAndUpdate(arg1, arg2, arg3);
  }

  leaveFindOne2(arg1) {
    return this.shared.leaveRepo.findOne(arg1);
  }

  resultFindOneAndUpdate2(arg1, arg2, arg3) {
    return this.models["leave-request"].findOneAndUpdate(arg1, arg2, arg3);
  }
}

module.exports = LeaveRepository;
