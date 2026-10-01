/** Database operations for auth-throttle; dependencies are wired in config/container.js. */
class AuthThrottleRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  findOneAndUpdate(arg1, arg2, arg3) {
    return this.models["auth-attempt"].findOneAndUpdate(arg1, arg2, arg3);
  }

  findOneAndUpdate2(arg1, arg2, arg3) {
    return this.models["auth-attempt"].findOneAndUpdate(arg1, arg2, arg3);
  }

  releaseUpdateOne(arg1, arg2) {
    return this.models["auth-attempt"].updateOne(arg1, arg2);
  }
}

module.exports = AuthThrottleRepository;
