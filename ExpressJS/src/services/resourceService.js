const ApiError = require('../utils/ApiError');
const LearningMaterial = require('../models/LearningMaterial');
const LibraryBook = require('../models/LibraryBook');
const BookLoan = require('../models/BookLoan');
const FacilityRequest = require('../models/FacilityRequest');
const { ROLES } = require('../constants/roles');
const { schoolScope, personalStudentIds } = require('./dataScope');
const { scopedDocument, reference, targetSchool, pick, academicReferences } = require('./writeScope');
const User = require('../models/User');
const Subject = require('../models/Subject');

// Materials
const listMaterials = async (actor, query = {}) => {
  const filter = await schoolScope(actor);
  if (query.subjectId) filter.subjectId = query.subjectId;
  if (query.classId) filter.classId = query.classId;
  const personal = await personalStudentIds(actor);
  if (personal !== null) {
    const students = await User.find({ _id: { $in: personal } }).select('classId');
    filter.$and = [{ $or: [{ classId: null }, { classId: { $in: students.map(s => s.classId).filter(Boolean) } }] }, { isShared: true }];
  }
  return LearningMaterial.find(filter)
    .populate('subjectId', 'name')
    .populate('classId', 'name')
    .populate('uploadedBy', 'name')
    .sort({ createdAt: -1 });
};

const createMaterial = async (actor, data) => {
  if (!data.title) throw new ApiError(400, 'Thiếu tiêu đề');
  const schoolId = await targetSchool(actor, data.schoolId);
  if (data.classId) await academicReferences(actor, data);
  if (data.subjectId) await reference(Subject, data.subjectId, schoolId);
  return LearningMaterial.create({
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
  });
};

const deleteMaterial = async (actor, id) => {
  const item = await scopedDocument(LearningMaterial, actor, id);
  if (!item) throw new ApiError(404, 'Không tìm thấy học liệu');
  if (
    String(item.uploadedBy) !== String(actor._id) &&
    ![ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN].includes(actor.role)
  ) {
    throw new ApiError(403, 'Không có quyền xóa');
  }
  await item.deleteOne();
  return true;
};

// Library
const listBooks = async (actor, query = {}) => {
  const filter = await schoolScope(actor);
  if (query.q) filter.title = new RegExp(query.q, 'i');
  return LibraryBook.find(filter).sort({ title: 1 });
};

const createBook = async (actor, data) => {
  if (!data.title) throw new ApiError(400, 'Thiếu tên sách');
  const qty = data.quantity || 1;
  return LibraryBook.create({
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
  const book = await LibraryBook.findByIdAndUpdate(id, pick(data, ['title', 'author', 'isbn']), { new: true, runValidators: true });
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
  await book.save();
  return BookLoan.create({
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
  await loan.save();
  await LibraryBook.findByIdAndUpdate(loan.bookId, { $inc: { available: 1 } });
  return loan;
};

const listLoans = async (actor, query = {}) => {
  const filter = await schoolScope(actor);
  if (query.status) filter.status = query.status;
  if (actor.role === ROLES.STUDENT) filter.borrowerId = actor._id;
  if (actor.role === ROLES.PARENT) filter.borrowerId = { $in: actor.parentOf || [] };
  return BookLoan.find(filter)
    .populate('bookId', 'title author')
    .populate('borrowerId', 'name code')
    .sort({ createdAt: -1 });
};

// Facilities
const listFacilities = async (actor, query = {}) => {
  const filter = await schoolScope(actor);
  if (query.status) filter.status = query.status;
  if ([ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER].includes(actor.role)) {
    filter.requesterId = actor._id;
  }
  return FacilityRequest.find(filter)
    .populate('requesterId', 'name')
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 });
};

const createFacility = async (actor, data) => {
  if (!data.itemName || !data.from || !data.to) throw new ApiError(400, 'Thiếu thông tin');
  return FacilityRequest.create({
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
  await item.save();
  return item;
};

module.exports = {
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
