class SeedRepository {
  constructor({ models }) {
    this.models = models;
  }

  async clear(names) {
    for (const name of names) await this.models[name].deleteMany({});
  }

  create(name, data) {
    return this.models[name].create(data);
  }

  findOne(name, filter) {
    return this.models[name].findOne(filter);
  }

  findByIdAndUpdate(name, id, update) {
    return this.models[name].findByIdAndUpdate(id, update);
  }
}

module.exports = SeedRepository;
