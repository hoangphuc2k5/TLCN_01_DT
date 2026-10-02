/** Database operations for resource; dependencies are wired in config/container.js. */
class ResourceRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  studentsFind(arg1) {
    return this.models["user"].find(arg1).select('classId');
  }

  listMaterialsFind(arg1, arg2) {
    return this.models["learning-material"].find(arg1).populate('subjectId', 'name').populate('classId', 'name').populate('uploadedBy', 'name').sort(arg2);
  }

  createMaterialCreate(arg1) {
    return this.models["learning-material"].create(arg1);
  }

  deleteMaterialDeleteOne(document) {
    return document.deleteOne();
  }

  listBooksFind(arg1, arg2) {
    return this.models["library-book"].find(arg1).sort(arg2);
  }

  createBookCreate(arg1) {
    return this.models["library-book"].create(arg1);
  }

  bookFindByIdAndUpdate(arg1, arg2, arg3) {
    return this.models["library-book"].findByIdAndUpdate(arg1, arg2, arg3);
  }

  borrowBookSave(document) {
    return document.save();
  }

  borrowBookCreate(arg1) {
    return this.models["book-loan"].create(arg1);
  }

  returnBookSave(document) {
    return document.save();
  }

  returnBookFindByIdAndUpdate(arg1, arg2) {
    return this.models["library-book"].findByIdAndUpdate(arg1, arg2);
  }

  listLoansFind(arg1, arg2) {
    return this.models["book-loan"].find(arg1).populate('bookId', 'title author').populate('borrowerId', 'name code').sort(arg2);
  }

  listFacilitiesFind(arg1, arg2) {
    return this.models["facility-request"].find(arg1).populate('requesterId', 'name').populate('reviewedBy', 'name').sort(arg2);
  }

  createFacilityCreate(arg1) {
    return this.models["facility-request"].create(arg1);
  }

  reviewFacilitySave(document) {
    return document.save();
  }
}

module.exports = ResourceRepository;
