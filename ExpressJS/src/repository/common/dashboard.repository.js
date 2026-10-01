/** Database operations for dashboard; dependencies are wired in config/container.js. */
class DashboardRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  listNotificationsFind(arg1, arg2) {
    return this.shared.notificationRepo.find(arg1, arg2);
  }

  nFindById(arg1) {
    return this.shared.notificationRepo.findById(arg1);
  }

  markReadUpdateById(arg1, arg2) {
    return this.shared.notificationRepo.updateById(arg1, arg2);
  }

  markAllReadUpdateMany(arg1, arg2) {
    return this.models["notification"].updateMany(arg1, arg2);
  }

  count(model, filter = {}) {
    return this.models[model].countDocuments(filter);
  }

  findSchools(filter) {
    return this.models.school.find(filter);
  }

  findGrades(filter, populations = []) {
    let query = this.models.grade.find(filter);
    for (const [path, select] of populations) query = query.populate(path, select);
    return query;
  }

  findInvoices(filter, options = {}) {
    let query = this.models['fee-invoice'].find(filter);
    if (options.sort) query = query.sort(options.sort);
    if (options.limit) query = query.limit(options.limit);
    return query;
  }
}

module.exports = DashboardRepository;
