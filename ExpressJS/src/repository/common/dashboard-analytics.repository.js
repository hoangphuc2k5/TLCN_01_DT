/** Database operations for dashboard-analytics; dependencies are wired in config/container.js. */
class DashboardAnalyticsRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  studentsFind(arg1) {
    return this.models["user"].find(arg1).select('classId').lean();
  }

  statusRowsAggregate(arg1) {
    return this.models["attendance"].aggregate(arg1);
  }

  trendAggregate(arg1) {
    return this.models["attendance"].aggregate(arg1);
  }

  rowsAggregate(arg1) {
    return this.models["fee-invoice"].aggregate(arg1);
  }

  rowsFind(arg1) {
    return this.models["grade"].find(arg1).select('average').lean();
  }

  assignmentsFind(arg1) {
    return this.models["homework"].find(arg1).select('_id').lean();
  }

  rowsAggregate2(arg1) {
    return this.models["homework-submission"].aggregate(arg1);
  }
}

module.exports = DashboardAnalyticsRepository;
