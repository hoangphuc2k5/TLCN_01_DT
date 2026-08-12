const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const subscriptionService = require('../services/subscriptionService');
const examService = require('../services/examService');
const resourceService = require('../services/resourceService');
const adminExtraService = require('../services/adminExtraService');

// Subscriptions
const listSubscriptions = asyncHandler(async (req, res) => {
  return success(res, await subscriptionService.listSubscriptions(req.user, req.query));
});
const upsertSubscription = asyncHandler(async (req, res) => {
  return success(res, await subscriptionService.upsertSubscription(req.user, req.body), 'Lưu gói dịch vụ thành công');
});
const listSubInvoices = asyncHandler(async (req, res) => {
  return success(res, await subscriptionService.listInvoices(req.user, req.query));
});
const createSubInvoice = asyncHandler(async (req, res) => {
  return success(res, await subscriptionService.createInvoice(req.user, req.body), 'Tạo hóa đơn gia hạn thành công', 201);
});
const markSubInvoicePaid = asyncHandler(async (req, res) => {
  return success(res, await subscriptionService.markInvoicePaid(req.user, req.params.id), 'Đã ghi nhận thanh toán');
});

// Exams
const listExams = asyncHandler(async (req, res) => {
  return success(res, await examService.listExams(req.user, req.query));
});
const getExam = asyncHandler(async (req, res) => {
  return success(res, await examService.getExam(req.user, req.params.id));
});
const createExam = asyncHandler(async (req, res) => {
  return success(res, await examService.createExam(req.user, req.body), 'Tạo đề thi thành công', 201);
});
const updateExam = asyncHandler(async (req, res) => {
  return success(res, await examService.updateExam(req.user, req.params.id, req.body), 'Cập nhật đề thi thành công');
});
const startAttempt = asyncHandler(async (req, res) => {
  return success(res, await examService.startAttempt(req.user, req.params.id), 'Bắt đầu làm bài', 201);
});
const submitAttempt = asyncHandler(async (req, res) => {
  return success(res, await examService.submitAttempt(req.user, req.params.attemptId, req.body.answers), 'Nộp bài thành công');
});
const gradeAttempt = asyncHandler(async (req, res) => {
  return success(res, await examService.gradeEssay(req.user, req.params.attemptId, req.body.grades), 'Chấm bài thành công');
});
const listAttempts = asyncHandler(async (req, res) => {
  return success(res, await examService.listAttempts(req.user, req.query));
});

// Materials
const listMaterials = asyncHandler(async (req, res) => {
  return success(res, await resourceService.listMaterials(req.user, req.query));
});
const createMaterial = asyncHandler(async (req, res) => {
  return success(res, await resourceService.createMaterial(req.user, req.body), 'Thêm học liệu thành công', 201);
});
const deleteMaterial = asyncHandler(async (req, res) => {
  await resourceService.deleteMaterial(req.user, req.params.id);
  return success(res, true, 'Xóa học liệu thành công');
});

// Library
const listBooks = asyncHandler(async (req, res) => {
  return success(res, await resourceService.listBooks(req.user, req.query));
});
const createBook = asyncHandler(async (req, res) => {
  return success(res, await resourceService.createBook(req.user, req.body), 'Thêm sách thành công', 201);
});
const updateBook = asyncHandler(async (req, res) => {
  return success(res, await resourceService.updateBook(req.user, req.params.id, req.body), 'Cập nhật sách thành công');
});
const borrowBook = asyncHandler(async (req, res) => {
  return success(res, await resourceService.borrowBook(req.user, req.body), 'Cho mượn thành công', 201);
});
const returnBook = asyncHandler(async (req, res) => {
  return success(res, await resourceService.returnBook(req.user, req.params.id), 'Trả sách thành công');
});
const listLoans = asyncHandler(async (req, res) => {
  return success(res, await resourceService.listLoans(req.user, req.query));
});

// Facilities
const listFacilities = asyncHandler(async (req, res) => {
  return success(res, await resourceService.listFacilities(req.user, req.query));
});
const createFacility = asyncHandler(async (req, res) => {
  return success(res, await resourceService.createFacility(req.user, req.body), 'Gửi yêu cầu thành công', 201);
});
const reviewFacility = asyncHandler(async (req, res) => {
  return success(res, await resourceService.reviewFacility(req.user, req.params.id, req.body), 'Cập nhật yêu cầu thành công');
});

// Audit / Support / Conduct / Templates
const listAuditLogs = asyncHandler(async (req, res) => {
  return success(res, await adminExtraService.listAuditLogs(req.user, req.query));
});
const listTickets = asyncHandler(async (req, res) => {
  return success(res, await adminExtraService.listTickets(req.user, req.query));
});
const createTicket = asyncHandler(async (req, res) => {
  return success(res, await adminExtraService.createTicket(req.user, req.body), 'Tạo ticket thành công', 201);
});
const updateTicket = asyncHandler(async (req, res) => {
  return success(res, await adminExtraService.updateTicket(req.user, req.params.id, req.body), 'Cập nhật ticket thành công');
});
const listConduct = asyncHandler(async (req, res) => {
  return success(res, await adminExtraService.listConduct(req.user, req.query));
});
const upsertConduct = asyncHandler(async (req, res) => {
  return success(res, await adminExtraService.upsertConduct(req.user, req.body), 'Lưu hạnh kiểm thành công');
});
const listTemplates = asyncHandler(async (req, res) => {
  return success(res, await adminExtraService.listTemplates(req.user, req.query));
});
const createTemplate = asyncHandler(async (req, res) => {
  return success(res, await adminExtraService.createTemplate(req.user, req.body), 'Tạo mẫu thành công', 201);
});
const updateTemplate = asyncHandler(async (req, res) => {
  return success(res, await adminExtraService.updateTemplate(req.user, req.params.id, req.body), 'Cập nhật mẫu thành công');
});
const applyTemplate = asyncHandler(async (req, res) => {
  return success(
    res,
    await adminExtraService.applyTemplateToSchool(req.user, req.params.schoolId, req.body.templateId),
    'Áp dụng mẫu thành công'
  );
});

module.exports = {
  listSubscriptions,
  upsertSubscription,
  listSubInvoices,
  createSubInvoice,
  markSubInvoicePaid,
  listExams,
  getExam,
  createExam,
  updateExam,
  startAttempt,
  submitAttempt,
  gradeAttempt,
  listAttempts,
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
  listAuditLogs,
  listTickets,
  createTicket,
  updateTicket,
  listConduct,
  upsertConduct,
  listTemplates,
  createTemplate,
  updateTemplate,
  applyTemplate,
};
