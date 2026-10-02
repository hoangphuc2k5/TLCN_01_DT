/** Database operations for contact-book; dependencies are wired in config/container.js. */
class ContactBookRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  listFind(arg1, arg2, arg3) {
    return this.models["contact-book-entry"].find(arg1).populate(arg2).sort(arg3).limit(500);
  }

  rowFindOne(arg1, arg2) {
    return this.models["contact-book-entry"].findOne(arg1).populate(arg2);
  }

  studentFindOne(arg1) {
    return this.models["user"].findOne(arg1);
  }

  createCreate(arg1) {
    return this.models["contact-book-entry"].create(arg1);
  }

  updateSave(document) {
    return document.save();
  }

  publishSave(document) {
    return document.save();
  }

  replySave(document) {
    return document.save();
  }
}

module.exports = ContactBookRepository;
