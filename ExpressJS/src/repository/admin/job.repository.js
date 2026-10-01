/** Database operations for job; dependencies are wired in config/container.js. */
class JobRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  enqueueFindOneAndUpdate(arg1, arg2, arg3) {
    return this.models["job"].findOneAndUpdate(arg1, arg2, arg3);
  }

  enqueueFindOne(arg1) {
    return this.models["job"].findOne(arg1);
  }

  notificationsFind(arg1, arg2) {
    return this.models["notification"].find(arg1).select('+emailRunAt').sort(arg2).limit(100);
  }

  dispatchUpdateOne(arg1, arg2) {
    return this.models["notification"].updateOne(arg1, arg2);
  }

  filesFind(arg1, arg2) {
    return this.models["file-asset"].find(arg1).sort(arg2).limit(100);
  }

  dispatchUpdateOne2(arg1, arg2) {
    return this.models["file-asset"].updateOne(arg1, arg2);
  }

  claimUpdateMany(arg1, arg2) {
    return this.models["job"].updateMany(arg1, arg2);
  }

  claimFindOneAndUpdate(arg1, arg2, arg3) {
    return this.models["job"].findOneAndUpdate(arg1, arg2, arg3).select('+lockToken');
  }

  heartbeatUpdateOne(arg1, arg2) {
    return this.models["job"].updateOne(arg1, arg2);
  }

  completeUpdateOne(arg1, arg2) {
    return this.models["job"].updateOne(arg1, arg2);
  }

  failUpdateOne(arg1, arg2) {
    return this.models["job"].updateOne(arg1, arg2);
  }

  listFind(arg1, arg2, arg3, arg4) {
    return this.models["job"].find(arg1).sort(arg2).skip(arg3).limit(arg4);
  }

  listCountDocuments(arg1) {
    return this.models["job"].countDocuments(arg1);
  }

  changeExists(arg1) {
    return this.models["job"].exists(arg1);
  }

  jobFindOneAndUpdate(arg1, arg2, arg3) {
    return this.models["job"].findOneAndUpdate(arg1, arg2, arg3);
  }
}

module.exports = JobRepository;
