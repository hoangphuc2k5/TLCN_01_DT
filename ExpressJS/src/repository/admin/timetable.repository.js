/** Database operations for timetable; dependencies are wired in config/container.js. */
class TimetableRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  listTimetablesFind(arg1, arg2) {
    return this.shared.timetableRepo.find(arg1, arg2);
  }

  validateReferencesExists(arg1, arg2) {
    return this.models["class"].exists(arg1).session(arg2);
  }

  validateReferencesExists2(arg1, arg2) {
    return this.models["academic-year"].exists(arg1).session(arg2);
  }

  teacherCountCountDocuments(arg1, arg2) {
    return this.models["user"].countDocuments(arg1).session(arg2);
  }

  subjectCountCountDocuments(arg1, arg2) {
    return this.models["subject"].countDocuments(arg1).session(arg2);
  }

  upsertTimetableFindOneAndUpdate(arg1, arg2, arg3) {
    return this.models["timetable"].findOneAndUpdate(arg1, arg2, arg3);
  }

  existingFindOne(arg1) {
    return this.shared.timetableRepo.findOne(arg1);
  }

  tableFindOne(arg1, arg2) {
    return this.models["timetable"].findOne(arg1).session(arg2);
  }

  approveTimetableSave(document, arg2) {
    return document.save(arg2);
  }
}

module.exports = TimetableRepository;
