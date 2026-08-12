const normalizePopulate = (populate) => {
  if (!populate) return [];
  if (Array.isArray(populate)) return populate;
  if (typeof populate === 'object') return [populate];
  if (typeof populate === 'string') {
    return populate
      .split(' ')
      .map((p) => p.trim())
      .filter(Boolean);
  }
  return [];
};

/**
 * Base Repository Pattern
 * Abstracts MongoDB access for reusable CRUD operations.
 */
class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  create(data) {
    return this.model.create(data);
  }

  findById(id, populate = []) {
    let query = this.model.findById(id);
    normalizePopulate(populate).forEach((p) => {
      query = query.populate(p);
    });
    return query;
  }

  findOne(filter = {}, populate = []) {
    let query = this.model.findOne(filter);
    normalizePopulate(populate).forEach((p) => {
      query = query.populate(p);
    });
    return query;
  }

  find(filter = {}, options = {}) {
    const {
      populate = [],
      sort = { createdAt: -1 },
      skip = 0,
      limit = 50,
      select,
    } = options;
    let query = this.model.find(filter).sort(sort).skip(skip).limit(limit);
    normalizePopulate(populate).forEach((p) => {
      query = query.populate(p);
    });
    if (select) query = query.select(select);
    return query;
  }

  count(filter = {}) {
    return this.model.countDocuments(filter);
  }

  updateById(id, data) {
    return this.model.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  deleteById(id) {
    return this.model.findByIdAndDelete(id);
  }
}

module.exports = BaseRepository;
