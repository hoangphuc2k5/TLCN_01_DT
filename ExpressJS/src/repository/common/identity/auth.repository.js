/** Database operations for auth; dependencies are wired in config/container.js. */
class AuthRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  userFindOne(arg1) {
    return this.shared.userRepo.findOne(arg1).select('+password +security');
  }

  userFindOne2(arg1) {
    return this.shared.userRepo.findOne(arg1).select('+password +security');
  }

  loginWithGoogleFindOne(arg1) {
    return this.shared.userRepo.findOne(arg1).select('+password +security');
  }

  userFindOne3(arg1) {
    return this.shared.userRepo.findOne(arg1).select('+password +security');
  }

  userFindById(arg1, arg2) {
    return this.shared.userRepo.findById(arg1, arg2).select('+security');
  }

  userUpdateById(arg1, arg2) {
    return this.shared.userRepo.updateById(arg1, arg2);
  }
}

module.exports = AuthRepository;
