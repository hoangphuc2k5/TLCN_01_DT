/** Database operations for school-comparison; dependencies are wired in config/container.js. */
class SchoolComparisonRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  schoolsFind(arg1) {
    return this.models["school"].find(arg1).select('name code subdomain status').lean();
  }

  yearsFind(arg1) {
    return this.models["academic-year"].find(arg1).lean();
  }

  compareAggregate(arg1) {
    return this.models["user"].aggregate(arg1);
  }

  compareAggregate2(arg1) {
    return this.models["class"].aggregate(arg1);
  }

  compareAggregate3(arg1) {
    return this.models["grade"].aggregate(arg1);
  }

  compareAggregate4(arg1) {
    return this.models["fee-invoice"].aggregate(arg1);
  }

  compareAggregate5(arg1) {
    return this.models["attendance"].aggregate(arg1);
  }
}

module.exports = SchoolComparisonRepository;
