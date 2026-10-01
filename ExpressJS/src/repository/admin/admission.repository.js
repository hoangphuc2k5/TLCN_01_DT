/** Database operations for admission; dependencies are wired in config/container.js. */
class AdmissionRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  schoolFindById(arg1) {
    return this.models["school"].findById(arg1).select('_id');
  }

  schoolFindOne(arg1) {
    return this.models["school"].findOne(arg1).select('_id');
  }

  createPublicCreate(arg1) {
    return this.models["admission-application"].create(arg1);
  }

  rowFindOne(arg1) {
    return this.models["admission-application"].findOne(arg1).select('trackingCode applicantName requestedGrade status reviewNote createdAt schoolId').populate('schoolId', 'name code');
  }

  listFind(arg1, arg2) {
    return this.models["admission-application"].find(arg1).populate('schoolId', 'name code').populate('reviewedBy', 'name email').sort(arg2).limit(500);
  }

  rowFindOne2(arg1) {
    return this.models["admission-application"].findOne(arg1);
  }

  reviewSave(document) {
    return document.save();
  }
}

module.exports = AdmissionRepository;
