/** Database operations for appointment; dependencies are wired in config/container.js. */
class AppointmentRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  appointmentsFind(arg1) {
    return this.models["teacher-appointment"].find(arg1).select('_id');
  }

  populatePopulate(document, arg2) {
    return document.populate('parentId', 'name email').populate('studentId', 'name code classId').populate('teacherId', 'name email').sort(arg2).limit(200);
  }

  studentFindOne(arg1) {
    return this.models["user"].findOne(arg1);
  }

  teacherFindOne(arg1) {
    return this.models["user"].findOne(arg1);
  }

  busyFind(arg1) {
    return this.models["teacher-appointment"].find(arg1).select('scheduledAt durationMinutes');
  }

  createAppointmentCreate(arg1) {
    return this.models["teacher-appointment"].create(arg1);
  }

  listAppointmentsFind(arg1) {
    return this.models["teacher-appointment"].find(arg1);
  }

  rowFindOne(arg1) {
    return this.models["teacher-appointment"].findOne(arg1);
  }

  reviewAppointmentSave(document) {
    return document.save();
  }

  rowFindOne2(arg1) {
    return this.models["teacher-appointment"].findOne(arg1);
  }

  cancelAppointmentSave(document) {
    return document.save();
  }

  listSurveysFind(arg1, arg2) {
    return this.models["satisfaction-survey"].find(arg1).populate('appointmentId', 'scheduledAt teacherId studentId status').populate('respondentId', 'name email').sort(arg2).limit(200);
  }

  rowFindOne3(arg1) {
    return this.models["teacher-appointment"].findOne(arg1);
  }

  submitSurveyCreate(arg1) {
    return this.models["satisfaction-survey"].create(arg1);
  }
}

module.exports = AppointmentRepository;
