/** Database operations for cross; dependencies are wired in config/container.js. */
class CrossRepository {
  constructor({ models, shared, database, eventBus }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
    this.eventBus = eventBus;
  }

  listMessagesFind(arg1, arg2) {
    return this.models["message"].find(arg1).populate('senderId', 'name email role').populate('receiverId', 'name email role').sort(arg2).limit(100);
  }

  receiverFindById(arg1) {
    return this.models["user"].findById(arg1);
  }

  parentFindOne(arg1) {
    return this.models["message"].findOne(arg1);
  }

  async msgCreate(arg1) {
    const document = await this.models["message"].create(arg1);
    this.eventBus.emit('message.created', document.toObject());
    return document;
  }

  async sendMessageCreate(arg1) {
    const document = await this.models["notification"].create(arg1);
    this.eventBus.emit('notification.created', document.toObject());
    return document;
  }

  msgFindById(arg1) {
    return this.models["message"].findById(arg1);
  }

  async markMessageReadSave(document) {
    const saved = await document.save();
    this.eventBus.emit('message.created', saved.toObject());
    return saved;
  }

  listEventsFind(arg1, arg2) {
    return this.models["calendar-event"].find(arg1).populate('createdBy', 'name').populate('classId', 'name').sort(arg2).limit(200);
  }

  createEventCreate(arg1) {
    return this.models["calendar-event"].create(arg1);
  }

  deleteEventDeleteOne(document) {
    return document.deleteOne();
  }

  gradesFind(arg1) {
    return this.models["grade"].find(arg1).populate('studentId', 'name code').populate('subjectId', 'name code').populate('classId', 'name').limit(1000);
  }

  feesFind(arg1) {
    return this.models["fee-invoice"].find(arg1).populate('studentId', 'name code').limit(1000);
  }

  listFind(arg1) {
    return this.models["attendance"].find(arg1).populate('classId', 'name').populate('records.studentId', 'name code').limit(200);
  }

  globalSearchFind(arg1) {
    return this.models["user"].find(arg1).select('name email role code').limit(20);
  }

  globalSearchFind2(arg1) {
    return this.models["class"].find(arg1).select('name gradeLevel').limit(10);
  }
}

module.exports = CrossRepository;
