/** Database operations for transcript-history; dependencies are wired in config/container.js. */
class TranscriptHistoryRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  existingFindOne(arg1) {
    return this.models["transcript-snapshot"].findOne(arg1);
  }

  latestFindOne(arg1, arg2) {
    return this.models["transcript-snapshot"].findOne(arg1).sort(arg2).select('version').lean();
  }

  captureCreate(arg1) {
    return this.models["transcript-snapshot"].create(arg1);
  }

  duplicateFindOne(arg1) {
    return this.models["transcript-snapshot"].findOne(arg1);
  }

  listFind(arg1, arg2) {
    return this.models["transcript-snapshot"].find(arg1).select('-transcript -contentHash').populate('createdBy', 'name code').sort(arg2).limit(200).lean();
  }

  snapshotFindOne(arg1) {
    return this.models["transcript-snapshot"].findOne(arg1).lean();
  }
}

module.exports = TranscriptHistoryRepository;
