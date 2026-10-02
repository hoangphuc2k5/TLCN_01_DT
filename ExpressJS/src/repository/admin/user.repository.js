/** Database operations for user; dependencies are wired in config/container.js. */
class UserRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  validateUserReferencesExists(arg1) {
    return this.models["cluster"].exists(arg1);
  }

  validateUserReferencesFindById(arg1) {
    return this.shared.schoolRepo.findById(arg1);
  }

  roleFindOne(arg1) {
    return this.models["role"].findOne(arg1).lean();
  }

  usersFind(arg1, arg2) {
    return this.shared.userRepo.find(arg1, arg2);
  }

  schoolFindById(arg1) {
    return this.shared.schoolRepo.findById(arg1);
  }

  userCreate(arg1) {
    return this.shared.userRepo.create(arg1);
  }

  existingFindById(arg1) {
    return this.shared.userRepo.findById(arg1);
  }

  userUpdateById(arg1, arg2) {
    return this.shared.userRepo.updateById(arg1, arg2);
  }

  existingFindById2(arg1) {
    return this.shared.userRepo.findById(arg1);
  }

  deleteUserDeleteById(arg1) {
    return this.shared.userRepo.deleteById(arg1);
  }
}

module.exports = UserRepository;
