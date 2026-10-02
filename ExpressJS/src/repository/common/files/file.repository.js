/** Database operations for file; dependencies are wired in config/container.js. */
class FileRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  transactionTransaction(arg1) {
    return this.database.connection.transaction(arg1);
  }

  subFindOne(arg1, arg2) {
    return this.models["subscription"].findOne(arg1).session(arg2);
  }

  itemFindById(arg1) {
    return this.models["school"].findById(arg1).select('+storageUsedBytes');
  }

  storedFindById(arg1) {
    return this.models["file-asset"].findById(arg1);
  }

  currentFindOne(arg1, arg2) {
    return this.models["file-asset"].findOne(arg1).session(arg2);
  }

  releasedUpdateOne(arg1, arg2, arg3) {
    return this.models["school"].updateOne(arg1, arg2, arg3);
  }

  purgeAssetDeleteMany(arg1, arg2) {
    return this.models["learning-material"].deleteMany(arg1).session(arg2);
  }

  purgeAssetDeleteMany2(arg1, arg2) {
    return this.models["material-download"].deleteMany(arg1).session(arg2);
  }

  purgeAssetUpdateMany(arg1, arg2, arg3) {
    return this.models["homework-submission"].updateMany(arg1, arg2, arg3);
  }

  purgeAssetDeleteOne(arg1, arg2) {
    return this.models["file-asset"].deleteOne(arg1).session(arg2);
  }

  assetFindOneAndUpdate(arg1, arg2, arg3) {
    return this.models["file-asset"].findOneAndUpdate(arg1, arg2, arg3);
  }

  assetNewDocument(arg1) {
    return new this.models["file-asset"](arg1);
  }

  materialNewDocument(arg1) {
    return new this.models["learning-material"](arg1);
  }

  uploadMaterialValidate(document) {
    return document.validate();
  }

  reservedUpdateOne(arg1, arg2, arg3) {
    return this.models["school"].updateOne(arg1, arg2, arg3);
  }

  uploadMaterialCreate(arg1, arg2) {
    return this.models["file-asset"].create(arg1, arg2);
  }

  uploadMaterialCreate2(arg1, arg2) {
    return this.models["learning-material"].create(arg1, arg2);
  }

  readyUpdateOne(arg1, arg2) {
    return this.models["file-asset"].updateOne(arg1, arg2);
  }

  uploadMaterialUpdateOne(arg1, arg2) {
    return this.models["file-asset"].updateOne(arg1, arg2);
  }

  assetFindOne(arg1) {
    return this.models["file-asset"].findOne(arg1);
  }

  accessibleAssetExists(arg1) {
    return this.models["learning-material"].exists(arg1);
  }

  studentFindOne(arg1) {
    return this.models["user"].findOne(arg1).select('_id schoolId');
  }

  assetNewDocument2(arg1) {
    return new this.models["file-asset"](arg1);
  }

  documentNewDocument(arg1) {
    return new this.models["student-document"](arg1);
  }

  uploadStudentDocumentValidate(document) {
    return document.validate();
  }

  reservedUpdateOne2(arg1, arg2, arg3) {
    return this.models["school"].updateOne(arg1, arg2, arg3);
  }

  uploadStudentDocumentCreate(arg1, arg2) {
    return this.models["file-asset"].create(arg1, arg2);
  }

  uploadStudentDocumentCreate2(arg1, arg2) {
    return this.models["student-document"].create(arg1, arg2);
  }

  readyUpdateOne2(arg1, arg2) {
    return this.models["file-asset"].updateOne(arg1, arg2);
  }

  uploadStudentDocumentUpdateOne(arg1, arg2) {
    return this.models["file-asset"].updateOne(arg1, arg2);
  }

  listStudentDocumentsFind(arg1, arg2) {
    return this.models["student-document"].find(arg1).populate('studentId', 'name code').populate('uploadedBy', 'name').populate('fileAssetId', 'originalName mimeType sizeBytes status').sort(arg2).limit(300);
  }

  rowFindOne(arg1) {
    return this.models["student-document"].findOne(arg1).populate('fileAssetId');
  }

  assetNewDocument3(arg1) {
    return new this.models["file-asset"](arg1);
  }

  submissionFindOne(arg1, arg2) {
    return this.models["homework-submission"].findOne(arg1).session(arg2);
  }

  reservedUpdateOne3(arg1, arg2, arg3) {
    return this.models["school"].updateOne(arg1, arg2, arg3);
  }

  uploadHomeworkAttachmentCreate(arg1, arg2) {
    return this.models["file-asset"].create(arg1, arg2);
  }

  uploadHomeworkAttachmentSave(document, arg2) {
    return document.save(arg2);
  }

  readyUpdateOne3(arg1, arg2, arg3) {
    return this.models["file-asset"].updateOne(arg1, arg2, arg3);
  }

  submissionFindOne2(arg1, arg2) {
    return this.models["homework-submission"].findOne(arg1).session(arg2);
  }

  uploadHomeworkAttachmentSave2(document, arg2) {
    return document.save(arg2);
  }

  uploadHomeworkAttachmentUpdateOne(arg1, arg2) {
    return this.models["file-asset"].updateOne(arg1, arg2);
  }

  uploadHomeworkAttachmentFindById(arg1) {
    return this.models["file-asset"].findById(arg1);
  }

  assetFindOne2(arg1) {
    return this.models["file-asset"].findOne(arg1);
  }

  unfinishedAssetsFind(arg1) {
    return this.models["file-asset"].find(arg1);
  }

  recoverAssetFindOneAndUpdate(arg1, arg2, arg3) {
    return this.models["file-asset"].findOneAndUpdate(arg1, arg2, arg3);
  }

  submissionFindOne3(arg1) {
    return this.models["homework-submission"].findOne(arg1);
  }

  submissionFindOne4(arg1) {
    return this.models["homework-submission"].findOne(arg1);
  }
}

module.exports = FileRepository;
