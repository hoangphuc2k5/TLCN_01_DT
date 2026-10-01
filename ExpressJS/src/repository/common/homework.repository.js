/** Database operations for homework; dependencies are wired in config/container.js. */
class HomeworkRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  studentsFind(arg1) {
    return this.models["user"].find(arg1).select('classId');
  }

  validateReferencesExists(arg1) {
    return this.models["teacher-assignment"].exists(arg1);
  }

  rowsFind(arg1, arg2, arg3) {
    return this.models["homework"].find(arg1).populate(arg2).sort(arg3).limit(200);
  }

  submissionsFind(arg1) {
    return this.models["homework-submission"].find(arg1).select('homeworkId studentId status submissionMode score feedback submittedAt late attachmentIds').populate('attachmentIds', 'originalName mimeType sizeBytes status').lean();
  }

  rowFindOne(arg1, arg2) {
    return this.models["homework"].findOne(arg1).populate(arg2);
  }

  createHomeworkCreate(arg1) {
    return this.models["homework"].create(arg1);
  }

  updateHomeworkSave(document) {
    return document.save();
  }

  updatedFindOneAndUpdate(arg1, arg2, arg3) {
    return this.models["homework"].findOneAndUpdate(arg1, arg2, arg3);
  }

  updatedFindOneAndUpdate2(arg1, arg2, arg3) {
    return this.models["homework"].findOneAndUpdate(arg1, arg2, arg3);
  }

  previousFindOne(arg1) {
    return this.models["homework-submission"].findOne(arg1);
  }

  submitHomeworkFindOneAndUpdate(arg1, arg2, arg3) {
    return this.models["homework-submission"].findOneAndUpdate(arg1, arg2, arg3);
  }

  listSubmissionsFind(arg1, arg2) {
    return this.models["homework-submission"].find(arg1).populate('studentId', 'name code').populate('attachmentIds', 'originalName mimeType sizeBytes status').sort(arg2);
  }

  listSubmissionsFind2(arg1, arg2) {
    return this.models["homework-submission"].find(arg1).populate('studentId', 'name code').populate('attachmentIds', 'originalName mimeType sizeBytes status').sort(arg2);
  }

  listSubmissionsFind3(arg1, arg2) {
    return this.models["homework-submission"].find(arg1).populate('studentId', 'name code').populate('gradedBy', 'name').populate('attachmentIds', 'originalName mimeType sizeBytes status').sort(arg2).limit(500);
  }

  submissionFindById(arg1) {
    return this.models["homework-submission"].findById(arg1);
  }

  updatedFindOneAndUpdate3(arg1, arg2, arg3) {
    return this.models["homework-submission"].findOneAndUpdate(arg1, arg2, arg3);
  }
}

module.exports = HomeworkRepository;
