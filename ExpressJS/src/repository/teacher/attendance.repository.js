/** Database operations for attendance; dependencies are wired in config/container.js. */
class AttendanceRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  documentsFind(arg1, arg2) {
    return this.shared.attendanceRepo.find(arg1, arg2);
  }

  existingFindOne(arg1) {
    return this.shared.attendanceRepo.findOne(arg1);
  }

  recordAttendanceUpdateById(arg1, arg2) {
    return this.shared.attendanceRepo.updateById(arg1, arg2);
  }

  recordAttendanceCreate(arg1) {
    return this.shared.attendanceRepo.create(arg1);
  }
}

module.exports = AttendanceRepository;
