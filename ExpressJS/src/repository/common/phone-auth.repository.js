/** Database operations for phone-auth; dependencies are wired in config/container.js. */
class PhoneAuthRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  userFindOne(arg1) {
    return this.models["user"].findOne(arg1).select('_id');
  }

  challengeCreate(arg1) {
    return this.models["phone-login-challenge"].create(arg1);
  }

  challengeFindOne(arg1) {
    return this.models["phone-login-challenge"].findOne(arg1);
  }

  verifyCodeUpdateOne(arg1, arg2) {
    return this.models["phone-login-challenge"].updateOne(arg1, arg2);
  }

  userFindOne2(arg1) {
    return this.models["user"].findOne(arg1).select('+security');
  }
}

module.exports = PhoneAuthRepository;
