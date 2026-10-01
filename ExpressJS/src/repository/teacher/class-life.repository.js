/** Database operations for class-life; dependencies are wired in config/container.js. */
class ClassLifeRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  childrenFind(arg1) {
    return this.models["user"].find(arg1).select('classId');
  }

  childrenFind2(arg1) {
    return this.models["user"].find(arg1).select('classId');
  }

  yearFindById(arg1) {
    return this.models["academic-year"].findById(arg1);
  }

  listActivitiesFind(arg1, arg2, arg3) {
    return this.models["class-activity"].find(arg1).populate(arg2).sort(arg3).limit(300);
  }

  createActivityCreate(arg1) {
    return this.models["class-activity"].create(arg1);
  }

  rowFindOne(arg1) {
    return this.models["class-activity"].findOne(arg1);
  }

  publishActivitySave(document) {
    return document.save();
  }

  rowsFind(arg1, arg2, arg3) {
    return this.models["parent-meeting"].find(arg1).populate(arg2).sort(arg3).limit(200);
  }

  responsesFind(arg1) {
    return this.models["parent-meeting-response"].find(arg1).lean();
  }

  createMeetingCreate(arg1) {
    return this.models["parent-meeting"].create(arg1);
  }

  rowFindOne2(arg1) {
    return this.models["parent-meeting"].findOne(arg1);
  }

  cancelMeetingSave(document) {
    return document.save();
  }

  rowFindOne3(arg1) {
    return this.models["parent-meeting"].findOne(arg1);
  }

  rsvpFindOneAndUpdate(arg1, arg2, arg3) {
    return this.models["parent-meeting-response"].findOneAndUpdate(arg1, arg2, arg3);
  }
}

module.exports = ClassLifeRepository;
