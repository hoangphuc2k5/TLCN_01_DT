/** Database operations for club; dependencies are wired in config/container.js. */
class ClubRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  listClubsFind(arg1, arg2) {
    return this.models["club"].find(arg1).populate('coordinatorId', 'name code').sort(arg2);
  }

  createClubCreate(arg1) {
    return this.models["club"].create(arg1);
  }

  clubFindOne(arg1) {
    return this.models["club"].findOne(arg1);
  }

  countCountDocuments(arg1) {
    return this.models["club-registration"].countDocuments(arg1);
  }

  registerFindOneAndUpdate(arg1, arg2, arg3) {
    return this.models["club-registration"].findOneAndUpdate(arg1, arg2, arg3);
  }

  rowFindOne(arg1) {
    return this.models["club-registration"].findOne(arg1);
  }

  cancelRegistrationSave(document) {
    return document.save();
  }

  listRegistrationsFind(arg1, arg2) {
    return this.models["club-registration"].find(arg1).populate('clubId', 'name capacity').populate('studentId', 'name code').sort(arg2);
  }

  listRetakesFind(arg1, arg2) {
    return this.models["retake-request"].find(arg1).populate('studentId', 'name code classId').populate('subjectId', 'name code').populate('academicYearId', 'name').sort(arg2);
  }

  studentFindById(arg1) {
    return this.models["user"].findById(arg1).select('schoolId classId role');
  }

  clsFindOne(arg1) {
    return this.models["class"].findOne(arg1);
  }

  existingFindOne(arg1) {
    return this.models["retake-request"].findOne(arg1);
  }

  createRetakeCreate(arg1) {
    return this.models["retake-request"].create(arg1);
  }

  rowFindOne2(arg1) {
    return this.models["retake-request"].findOne(arg1);
  }

  reviewRetakeSave(document) {
    return document.save();
  }
}

module.exports = ClubRepository;
