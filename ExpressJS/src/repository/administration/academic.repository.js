/** Database operations for academic; dependencies are wired in config/container.js. */
class AcademicRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  listAcademicYearsFind(arg1) {
    return this.shared.academicYearRepo.find(arg1);
  }

  createAcademicYearNewDocument(arg1) {
    return new this.models["academic-year"](arg1).validate();
  }

  createAcademicYearUpdateMany(arg1, arg2) {
    return this.models["academic-year"].updateMany(arg1, arg2);
  }

  createAcademicYearCreate(arg1) {
    return this.shared.academicYearRepo.create(arg1);
  }

  studentsFind(arg1) {
    return this.models["user"].find(arg1).select('classId');
  }

  assignmentsFind(arg1, arg2) {
    return this.shared.assignmentRepo.find(arg1, arg2);
  }

  listClassesFind(arg1, arg2) {
    return this.shared.classRepo.find(arg1, arg2);
  }

  createClassCreate(arg1) {
    return this.shared.classRepo.create(arg1);
  }

  updatedUpdateById(arg1, arg2) {
    return this.shared.classRepo.updateById(arg1, arg2);
  }

  deleteClassDeleteById(arg1) {
    return this.shared.classRepo.deleteById(arg1);
  }

  listSubjectsFind(arg1) {
    return this.shared.subjectRepo.find(arg1);
  }

  createSubjectCreate(arg1) {
    return this.shared.subjectRepo.create(arg1);
  }

  subjectUpdateById(arg1, arg2) {
    return this.shared.subjectRepo.updateById(arg1, arg2);
  }

  listAssignmentsFind(arg1, arg2) {
    return this.shared.assignmentRepo.find(arg1, arg2);
  }

  createAssignmentCreate(arg1) {
    return this.shared.assignmentRepo.create(arg1);
  }

  deleteAssignmentDeleteById(arg1) {
    return this.shared.assignmentRepo.deleteById(arg1);
  }

  listStudentsInClassFind(arg1, arg2) {
    return this.shared.userRepo.find(arg1, arg2);
  }
}

module.exports = AcademicRepository;
