/** Database operations for schedule-transaction; dependencies are wired in config/container.js. */
class ScheduleTransactionRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  resultUpdateOne(arg1, arg2, arg3) {
    return this.models["school"].updateOne(arg1, arg2, arg3);
  }

  transaction(arg1) {
    return this.database.connection.transaction(arg1);
  }
}

module.exports = ScheduleTransactionRepository;
