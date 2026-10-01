/** Database operations for monitoring; dependencies are wired in config/container.js. */
class MonitoringRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  get readyState() { return this.database.connection.readyState; }

  getSystemMetricsCommand(arg1) {
    return this.database.connection.db.command(arg1);
  }

  schoolsFind(arg1) {
    return this.models["school"].find(arg1).select('+storageUsedBytes name code subdomain status').lean();
  }

  getSystemMetricsAggregate(arg1) {
    return this.models["user"].aggregate(arg1);
  }

  getSystemMetricsCountDocuments(arg1) {
    return this.models["class"].countDocuments(arg1);
  }
}

module.exports = MonitoringRepository;
