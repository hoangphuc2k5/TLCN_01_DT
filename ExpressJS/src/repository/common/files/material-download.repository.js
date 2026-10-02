/** Database operations for material-download; dependencies are wired in config/container.js. */
class MaterialDownloadRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  materialForAssetFindOne(arg1) {
    return this.models["learning-material"].findOne(arg1).select('_id schoolId uploadedBy title');
  }

  startCreate(arg1) {
    return this.models["material-download"].create(arg1);
  }

  completeUpdateOne(arg1, arg2) {
    return this.models["material-download"].updateOne(arg1, arg2);
  }

  failUpdateOne(arg1, arg2) {
    return this.models["material-download"].updateOne(arg1, arg2);
  }

  materialFindOne(arg1) {
    return this.models["learning-material"].findOne(arg1).select('_id schoolId uploadedBy title fileAssetId');
  }

  listFind(arg1, arg2) {
    return this.models["material-download"].find(arg1).populate('userId', 'name code role email').sort(arg2).limit(500);
  }

  listCountDocuments(arg1) {
    return this.models["material-download"].countDocuments(arg1);
  }

  listDistinct(arg1) {
    return this.models["material-download"].distinct('userId', arg1);
  }
}

module.exports = MaterialDownloadRepository;
