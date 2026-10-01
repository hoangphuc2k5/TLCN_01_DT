/** Database operations for reward; dependencies are wired in config/container.js. */
class RewardRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  listFind(arg1, arg2) {
    return this.models["reward-discipline-record"].find(arg1).populate('studentId', 'name code').populate('classId', 'name').populate('academicYearId', 'name').populate('recordedBy', 'name role').populate('reviewedBy', 'name').sort(arg2).limit(300);
  }

  createCreate(arg1) {
    return this.models["reward-discipline-record"].create(arg1);
  }

  rowFindOne(arg1) {
    return this.models["reward-discipline-record"].findOne(arg1);
  }

  reviewSave(document) {
    return document.save();
  }
}

module.exports = RewardRepository;
