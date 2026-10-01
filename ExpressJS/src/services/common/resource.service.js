function createResourceService(dependencies) {
  const persistence = dependencies.persistence;
  const ApiError = require("../../utils/common/api-error.util");
  const LearningMaterial = "learning-material";
  const LibraryBook = "library-book";
  const BookLoan = "book-loan";
  const FacilityRequest = "facility-request";
  const { ROLES } = require("../../config/constants/roles.config");
  const { schoolScope, personalStudentIds } = dependencies.services["data-scope"];
  const { scopedDocument, reference, targetSchool, pick, academicReferences } = dependencies.services["write-scope"];
  const User = "user";
  const Subject = "subject";
  
  // Materials
  const materialScope = async (actor, query = {}) => {
    const filter = await schoolScope(actor);
    if (query.subjectId) filter.subjectId = query.subjectId;
    if (query.classId) filter.classId = query.classId;
    const personal = await personalStudentIds(actor);
    if (personal !== null) {
      const students = await persistence.studentsFind({ _id: { $in: personal } });
      filter.$and = [{ $or: [{ classId: null }, { classId: { $in: students.map(s => s.classId).filter(Boolean) } }] }, { isShared: true }];
    } else if (![ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS].includes(actor.role)) {
      filter.$or = [{ uploadedBy: actor._id }, { isShared: true }];
    }
    return filter;
  };
  const listMaterials = async (actor, query = {}) => {
    return persistence.listMaterialsFind(await materialScope(actor, query), { createdAt: -1 });
  };
  
  const materialPayload = async (actor, data) => {
    if (!data.title) throw new ApiError(400, 'Thiếu tiêu đề');
    const schoolId = await targetSchool(actor, data.schoolId);
    if (data.classId) await academicReferences(actor, data, { expectedSchoolId: schoolId });
    if (data.subjectId) await reference(Subject, data.subjectId, schoolId);
    return {
      schoolId,
      title: data.title,
      subjectId: data.subjectId || null,
      classId: data.classId || null,
      uploadedBy: actor._id,
      fileUrl: data.fileUrl || '',
      fileType: data.fileType || 'LINK',
      topic: data.topic || '',
      description: data.description || '',
      isShared: data.isShared !== false,
    };
  };
  const createMaterial = async (actor, data) => persistence.createMaterialCreate(await materialPayload(actor, data));
  
  const deleteMaterial = async (actor, id) => {
    const item = await scopedDocument(LearningMaterial, actor, id);
    if (!item) throw new ApiError(404, 'Không tìm thấy học liệu');
    if (
      String(item.uploadedBy) !== String(actor._id) &&
      ![ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN].includes(actor.role)
    ) {
      throw new ApiError(403, 'Không có quyền xóa');
    }
    if (item.fileAssetId) await dependencies.services["file"].deleteAsset(item.fileAssetId);
    else await persistence.deleteMaterialDeleteOne(item);
    return true;
  };
  
  // Library
  const listBooks = async (actor, query = {}) => {
    const filter = await schoolScope(actor);
    if (query.q) filter.title = new RegExp(query.q, 'i');
    return persistence.listBooksFind(filter, { title: 1 });
  };
  
  const createBook = async (actor, data) => {
    if (!data.title) throw new ApiError(400, 'Thiếu tên sách');
    const qty = data.quantity || 1;
    return persistence.createBookCreate({
      schoolId: actor.schoolId,
      title: data.title,
      author: data.author || '',
      isbn: data.isbn || '',
      quantity: qty,
      available: data.available ?? qty,
    });
  };
  
  const updateBook = async (actor, id, data) => {
    await scopedDocument(LibraryBook, actor, id);
    const book = await persistence.bookFindByIdAndUpdate(id, pick(data, ['title', 'author', 'isbn']), { new: true, runValidators: true });
    if (!book) throw new ApiError(404, 'Không tìm thấy sách');
    return book;
  };
  
  const borrowBook = async (actor, data) => {
    const { bookId, borrowerId, dueAt } = data;
    if (!bookId || !borrowerId || !dueAt) throw new ApiError(400, 'Thiếu thông tin mượn');
    const book = await scopedDocument(LibraryBook, actor, bookId);
    if (!book) throw new ApiError(404, 'Không tìm thấy sách');
    await reference(User, borrowerId, book.schoolId);
    if (!Number.isFinite(new Date(dueAt).getTime())) throw new ApiError(400, 'Hạn trả không hợp lệ');
    if (book.available < 1) throw new ApiError(400, 'Sách đã hết');
    book.available -= 1;
    await persistence.borrowBookSave(book);
    return persistence.borrowBookCreate({
      schoolId: book.schoolId,
      bookId,
      borrowerId,
      dueAt,
      processedBy: actor._id,
      status: 'BORROWED',
      note: data.note || '',
    });
  };
  
  const returnBook = async (actor, loanId) => {
    const loan = await scopedDocument(BookLoan, actor, loanId);
    await reference(LibraryBook, loan.bookId, loan.schoolId);
    if (!loan) throw new ApiError(404, 'Không tìm thấy phiếu mượn');
    if (loan.status === 'RETURNED') throw new ApiError(400, 'Đã trả rồi');
    loan.status = 'RETURNED';
    loan.returnedAt = new Date();
    loan.processedBy = actor._id;
    await persistence.returnBookSave(loan);
    await persistence.returnBookFindByIdAndUpdate(loan.bookId, { $inc: { available: 1 } });
    return loan;
  };
  
  const listLoans = async (actor, query = {}) => {
    const filter = await schoolScope(actor);
    if (query.status) filter.status = query.status;
    if (actor.role === ROLES.STUDENT) filter.borrowerId = actor._id;
    if (actor.role === ROLES.PARENT) filter.borrowerId = { $in: actor.parentOf || [] };
    return persistence.listLoansFind(filter, { createdAt: -1 });
  };
  
  // Facilities
  const listFacilities = async (actor, query = {}) => {
    const filter = await schoolScope(actor);
    if (query.status) filter.status = query.status;
    if ([ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER].includes(actor.role)) {
      filter.requesterId = actor._id;
    }
    return persistence.listFacilitiesFind(filter, { createdAt: -1 });
  };
  
  const createFacility = async (actor, data) => {
    if (!data.itemName || !data.from || !data.to) throw new ApiError(400, 'Thiếu thông tin');
    return persistence.createFacilityCreate({
      schoolId: actor.schoolId,
      requesterId: actor._id,
      itemType: data.itemType || 'ROOM',
      itemName: data.itemName,
      from: data.from,
      to: data.to,
      note: data.note || '',
    });
  };
  
  const reviewFacility = async (actor, id, data) => {
    const item = await scopedDocument(FacilityRequest, actor, id);
    if (!item) throw new ApiError(404, 'Không tìm thấy yêu cầu');
    if (!['APPROVED', 'REJECTED', 'RETURNED'].includes(data.status)) {
      throw new ApiError(400, 'status không hợp lệ');
    }
    if (data.status === 'RETURNED' ? item.status !== 'APPROVED' : item.status !== 'PENDING') throw new ApiError(409, 'Trạng thái yêu cầu không phù hợp');
    if (data.status !== 'RETURNED' && String(item.requesterId) === String(actor._id)) throw new ApiError(403, 'Không được tự duyệt yêu cầu');
    item.status = data.status;
    item.reviewedBy = actor._id;
    item.reviewNote = data.reviewNote || '';
    if (data.status === 'RETURNED') {
      item.returnedAt = new Date();
      item.conditionOnReturn = data.conditionOnReturn || '';
    }
    await persistence.reviewFacilitySave(item);
    return item;
  };
  
  return {
    materialScope,
    materialPayload,
    listMaterials,
    createMaterial,
    deleteMaterial,
    listBooks,
    createBook,
    updateBook,
    borrowBook,
    returnBook,
    listLoans,
    listFacilities,
    createFacility,
    reviewFacility,
  };
  
}

class ResourceService {
  constructor(dependencies) {
    Object.assign(this, createResourceService(dependencies));
  }
}

module.exports = ResourceService;
