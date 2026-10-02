/** Database operations for announcement; dependencies are wired in config/container.js. */
class AnnouncementRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  schoolFindById(arg1) {
    return this.models["school"].findById(arg1).select('clusterId');
  }

  listAnnouncementsFind(arg1, arg2) {
    return this.shared.announcementRepo.find(arg1, arg2);
  }

  createAnnouncementFindById(arg1) {
    return this.models["school"].findById(arg1);
  }

  createAnnouncementExists(arg1) {
    return this.models["cluster"].exists(arg1);
  }

  announcementCreate(arg1) {
    return this.shared.announcementRepo.create(arg1);
  }

  usersFind(arg1) {
    return this.models["user"].find(arg1).select('_id');
  }

  studentsFind(arg1) {
    return this.models["user"].find(arg1).select('_id');
  }

  assignmentsFind(arg1) {
    return this.models["teacher-assignment"].find(arg1).select('teacherId');
  }

  clsFindById(arg1) {
    return this.models["class"].findById(arg1).select('homeroomTeacherId');
  }

  usersFind2(arg1) {
    return this.models["user"].find(arg1).select('_id');
  }

  itemFindById(arg1) {
    return this.shared.announcementRepo.findById(arg1);
  }

  deleteAnnouncementDeleteById(arg1) {
    return this.shared.announcementRepo.deleteById(arg1);
  }
}

module.exports = AnnouncementRepository;
