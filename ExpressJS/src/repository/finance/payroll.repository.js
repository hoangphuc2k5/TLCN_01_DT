/** Database operations for payroll; dependencies are wired in config/container.js. */
class PayrollRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  listFind(arg1, arg2) {
    return this.models["payroll-record"].find(arg1).populate('employeeId', 'name email role code').populate('approvedBy', 'name').sort(arg2).limit(300);
  }

  createCreate(arg1) {
    return this.models["payroll-record"].create(arg1);
  }

  recordFindOne(arg1) {
    return this.models["payroll-record"].findOne(arg1);
  }

  updateStatusSave(document) {
    return document.save();
  }
}

module.exports = PayrollRepository;
