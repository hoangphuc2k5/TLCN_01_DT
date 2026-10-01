/** Database operations for lesson-plan; dependencies are wired in config/container.js. */
class LessonPlanRepository {
  constructor({ models, shared, database, eventBus }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
    this.eventBus = eventBus;
  }

  listFind(arg1, arg2, arg3) {
    return this.models["lesson-plan"].find(arg1).populate(arg2).sort(arg3).limit(300);
  }

  rowFindOne(arg1, arg2) {
    return this.models["lesson-plan"].findOne(arg1).populate(arg2);
  }

  assignedExists(arg1) {
    return this.models["teacher-assignment"].exists(arg1);
  }

  yearFindOne(arg1) {
    return this.models["academic-year"].findOne(arg1);
  }

  createCreate(arg1) {
    return this.models["lesson-plan"].create(arg1);
  }

  updatedFindOneAndUpdate(arg1, arg2, arg3) {
    return this.models["lesson-plan"].findOneAndUpdate(arg1, arg2, arg3);
  }

  updatedFindOneAndUpdate2(arg1, arg2, arg3) {
    return this.models["lesson-plan"].findOneAndUpdate(arg1, arg2, arg3);
  }

  rowFindOne2(arg1) {
    return this.models["lesson-plan"].findOne(arg1);
  }

  updatedFindOneAndUpdate3(arg1, arg2, arg3) {
    return this.models["lesson-plan"].findOneAndUpdate(arg1, arg2, arg3);
  }

  async reviewCreate(arg1) {
    const document = await this.models["notification"].create(arg1);
    this.eventBus.emit('notification.created', document.toObject());
    return document;
  }

  resultDeleteOne(arg1) {
    return this.models["lesson-plan"].deleteOne(arg1);
  }
}

module.exports = LessonPlanRepository;
