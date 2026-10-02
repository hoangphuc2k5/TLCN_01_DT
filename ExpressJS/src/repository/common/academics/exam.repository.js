/** Database operations for exam; dependencies are wired in config/container.js. */
class ExamRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  studentsFind(arg1) {
    return this.models["user"].find(arg1).select('classId');
  }

  examFindOne(arg1) {
    return this.models["exam"].findOne(arg1);
  }

  expireAttemptFindOneAndUpdate(arg1, arg2, arg3) {
    return this.models["exam-attempt"].findOneAndUpdate(arg1, arg2, arg3);
  }

  listExamsFind(arg1, arg2, arg3) {
    return this.models["exam"].find(arg1).populate('subjectId', 'name code').populate('classId', 'name').populate('createdBy', 'name').select(arg2).sort(arg3);
  }

  getExamPopulate(document, arg2) {
    return document.populate(arg2);
  }

  createExamCreate(arg1) {
    return this.models["exam"].create(arg1);
  }

  updateExamExists(arg1) {
    return this.models["exam-attempt"].exists(arg1);
  }

  updateExamSave(document) {
    return document.save();
  }

  activeFindOne(arg1, arg2) {
    return this.models["exam-attempt"].findOne(arg1).sort(arg2);
  }

  countCountDocuments(arg1) {
    return this.models["exam-attempt"].countDocuments(arg1);
  }

  startAttemptCreate(arg1) {
    return this.models["exam-attempt"].create(arg1);
  }

  savedFindOneAndUpdate(arg1, arg2, arg3) {
    return this.models["exam-attempt"].findOneAndUpdate(arg1, arg2, arg3);
  }

  savedFindOneAndUpdate2(arg1, arg2, arg3) {
    return this.models["exam-attempt"].findOneAndUpdate(arg1, arg2, arg3);
  }

  gradeEssaySave(document) {
    return document.save();
  }

  examsFind(arg1) {
    return this.models["exam"].find(arg1).select('_id');
  }

  attemptsFind(arg1, arg2) {
    return this.models["exam-attempt"].find(arg1).populate('studentId', 'name code').populate('examId', 'title showResults').sort(arg2).limit(100);
  }

  examFindById(arg1) {
    return this.models["exam"].findById(arg1).select('durationMinutes questions showResults');
  }

  listAttemptsPopulate(document, arg2) {
    return document.populate(arg2);
  }
}

module.exports = ExamRepository;
