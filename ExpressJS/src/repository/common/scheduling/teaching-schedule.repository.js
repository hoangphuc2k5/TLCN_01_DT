/** Database operations for teaching-schedule; dependencies are wired in config/container.js. */
class TeachingScheduleRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  tablesFind(arg1, arg2) {
    return this.models["timetable"].find(arg1).populate(arg2).lean();
  }

  makeupsFind(arg1, arg2) {
    return this.models["leave-request"].find(arg1).select('makeup').populate(arg2).lean();
  }

  absencesFind(arg1) {
    return this.models["leave-request"].find(arg1).select('requesterId fromDate toDate').lean();
  }

  absenceFindOne(arg1, arg2) {
    return this.models["leave-request"].findOne(arg1).session(arg2);
  }

  tableFindOne(arg1, arg2) {
    return this.models["timetable"].findOne(arg1).session(arg2);
  }

  yearFindOne(arg1, arg2) {
    return this.models["academic-year"].findOne(arg1).session(arg2);
  }

  prepareMakeupExists(arg1, arg2) {
    return this.models["teacher-assignment"].exists(arg1).session(arg2);
  }

  prepareMakeupExists2(arg1, arg2) {
    return this.models["user"].exists(arg1).session(arg2);
  }

  previousExists(arg1, arg2) {
    return this.models["leave-request"].exists(arg1).session(arg2);
  }

  absencesFind2(arg1, arg2) {
    return this.models["leave-request"].find(arg1).session(arg2).lean();
  }

  tablesFind2(arg1, arg2) {
    return this.models["timetable"].find(arg1).populate('academicYearId').session(arg2).lean();
  }

  makeupsFind2(arg1, arg2) {
    return this.models["leave-request"].find(arg1).session(arg2).lean();
  }

  conflictExists(arg1, arg2) {
    return this.models["leave-request"].exists(arg1).session(arg2);
  }

  yearFindOne2(arg1, arg2) {
    return this.models["academic-year"].findOne(arg1).session(arg2);
  }

  peersFind(arg1, arg2) {
    return this.models["timetable"].find(arg1).populate('academicYearId').session(arg2).lean();
  }

  makeupsFind3(arg1, arg2) {
    return this.models["leave-request"].find(arg1).session(arg2).lean();
  }

  absencesFind3(arg1, arg2) {
    return this.models["leave-request"].find(arg1).session(arg2).lean();
  }
}

module.exports = TeachingScheduleRepository;
