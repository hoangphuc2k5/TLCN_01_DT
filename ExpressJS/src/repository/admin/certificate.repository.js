/** Database operations for certificate; dependencies are wired in config/container.js. */
class CertificateRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  studentFindOne(arg1, arg2) {
    return this.models["user"].findOne(arg1).select('name code schoolId classId classHistory dateOfBirth gender').populate(arg2).lean();
  }

  getTranscriptFindById(arg1) {
    return this.models["school"].findById(arg1).select('name code address phone email').lean();
  }

  getTranscriptFind(arg1, arg2) {
    return this.models["grade"].find(arg1).populate('subjectId', 'name code').populate('academicYearId', 'name').populate('classId', 'name gradeLevel').sort(arg2).lean();
  }

  getTranscriptFind2(arg1, arg2) {
    return this.models["conduct-record"].find(arg1).populate('academicYearId', 'name').populate('classId', 'name gradeLevel').sort(arg2).lean();
  }

  getTranscriptFind3(arg1, arg2) {
    return this.models["reward-discipline-record"].find(arg1).populate('academicYearId', 'name').populate('classId', 'name gradeLevel').sort(arg2).lean();
  }
}

module.exports = CertificateRepository;
