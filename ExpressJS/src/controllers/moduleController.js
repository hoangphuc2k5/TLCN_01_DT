const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const userService = require('../services/userService');
const tenantService = require('../services/tenantService');
const academicService = require('../services/academicService');
const attendanceService = require('../services/attendanceService');
const gradeService = require('../services/gradeService');
const feeService = require('../services/feeService');
const announcementService = require('../services/announcementService');
const leaveService = require('../services/leaveService');
const timetableService = require('../services/timetableService');
const dashboardService = require('../services/dashboardService');

// Users
const listUsers = asyncHandler(async (req, res) => {
  const data = await userService.listUsers(req.user, req.query);
  return success(res, data);
});
const createUser = asyncHandler(async (req, res) => {
  const data = await userService.createUser(req.user, req.body);
  return success(res, data, 'Tạo người dùng thành công', 201);
});
const updateUser = asyncHandler(async (req, res) => {
  const data = await userService.updateUser(req.user, req.params.id, req.body);
  return success(res, data, 'Cập nhật người dùng thành công');
});
const resetUserPassword = asyncHandler(async (req, res) => {
  const data = await userService.resetPassword(req.user, req.params.id);
  return success(
    res,
    data,
    `Đã reset mật khẩu về mặc định: ${data.defaultPassword}`
  );
});
const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.user, req.params.id);
  return success(res, true, 'Xóa người dùng thành công');
});

// Clusters / Schools
const listClusters = asyncHandler(async (req, res) => {
  return success(res, await tenantService.listClusters(req.user, req.query));
});
const createCluster = asyncHandler(async (req, res) => {
  return success(res, await tenantService.createCluster(req.body), 'Tạo cụm thành công', 201);
});
const updateCluster = asyncHandler(async (req, res) => {
  return success(res, await tenantService.updateCluster(req.params.id, req.body), 'Cập nhật cụm thành công');
});
const deleteCluster = asyncHandler(async (req, res) => {
  await tenantService.deleteCluster(req.params.id);
  return success(res, true, 'Xóa cụm thành công');
});
const listSchools = asyncHandler(async (req, res) => {
  return success(res, await tenantService.listSchools(req.user, req.query));
});
const createSchool = asyncHandler(async (req, res) => {
  return success(res, await tenantService.createSchool(req.user, req.body), 'Tạo trường thành công', 201);
});
const updateSchool = asyncHandler(async (req, res) => {
  return success(res, await tenantService.updateSchool(req.user, req.params.id, req.body), 'Cập nhật trường thành công');
});
const deleteSchool = asyncHandler(async (req, res) => {
  await tenantService.deleteSchool(req.params.id);
  return success(res, true, 'Xóa trường thành công');
});

// Academic
const listAcademicYears = asyncHandler(async (req, res) => {
  return success(res, await academicService.listAcademicYears(req.user, req.query));
});
const createAcademicYear = asyncHandler(async (req, res) => {
  return success(res, await academicService.createAcademicYear(req.user, req.body), 'Tạo năm học thành công', 201);
});
const listClasses = asyncHandler(async (req, res) => {
  return success(res, await academicService.listClasses(req.user, req.query));
});
const createClass = asyncHandler(async (req, res) => {
  return success(res, await academicService.createClass(req.user, req.body), 'Tạo lớp thành công', 201);
});
const updateClass = asyncHandler(async (req, res) => {
  return success(res, await academicService.updateClass(req.user, req.params.id, req.body), 'Cập nhật lớp thành công');
});
const deleteClass = asyncHandler(async (req, res) => {
  await academicService.deleteClass(req.user, req.params.id);
  return success(res, true, 'Xóa lớp thành công');
});
const listSubjects = asyncHandler(async (req, res) => {
  return success(res, await academicService.listSubjects(req.user, req.query));
});
const createSubject = asyncHandler(async (req, res) => {
  return success(res, await academicService.createSubject(req.user, req.body), 'Tạo môn thành công', 201);
});
const updateSubject = asyncHandler(async (req, res) => {
  return success(res, await academicService.updateSubject(req.params.id, req.body), 'Cập nhật môn thành công');
});
const listAssignments = asyncHandler(async (req, res) => {
  return success(res, await academicService.listAssignments(req.user, req.query));
});
const createAssignment = asyncHandler(async (req, res) => {
  return success(res, await academicService.createAssignment(req.user, req.body), 'Phân công thành công', 201);
});
const deleteAssignment = asyncHandler(async (req, res) => {
  await academicService.deleteAssignment(req.params.id);
  return success(res, true, 'Xóa phân công thành công');
});
const listStudentsInClass = asyncHandler(async (req, res) => {
  return success(res, await academicService.listStudentsInClass(req.params.id));
});

// Attendance / Grades / Fees / etc.
const listAttendance = asyncHandler(async (req, res) => {
  return success(res, await attendanceService.listAttendance(req.user, req.query));
});
const recordAttendance = asyncHandler(async (req, res) => {
  return success(res, await attendanceService.recordAttendance(req.user, req.body), 'Lưu điểm danh thành công');
});
const listGrades = asyncHandler(async (req, res) => {
  return success(res, await gradeService.listGrades(req.user, req.query));
});
const upsertGrade = asyncHandler(async (req, res) => {
  return success(res, await gradeService.upsertGrade(req.user, req.body), 'Lưu điểm thành công');
});
const addScore = asyncHandler(async (req, res) => {
  return success(res, await gradeService.addScore(req.user, req.params.id, req.body), 'Thêm cột điểm thành công');
});
const listInvoices = asyncHandler(async (req, res) => {
  return success(res, await feeService.listInvoices(req.user, req.query));
});
const createInvoice = asyncHandler(async (req, res) => {
  return success(res, await feeService.createInvoice(req.user, req.body), 'Tạo hóa đơn thành công', 201);
});
const recordPayment = asyncHandler(async (req, res) => {
  return success(res, await feeService.recordPayment(req.user, req.body), 'Ghi nhận thanh toán thành công');
});
const listPayments = asyncHandler(async (req, res) => {
  return success(res, await feeService.listPayments(req.user, req.query));
});
const listAnnouncements = asyncHandler(async (req, res) => {
  return success(res, await announcementService.listAnnouncements(req.user, req.query));
});
const createAnnouncement = asyncHandler(async (req, res) => {
  return success(res, await announcementService.createAnnouncement(req.user, req.body), 'Gửi thông báo thành công', 201);
});
const deleteAnnouncement = asyncHandler(async (req, res) => {
  await announcementService.deleteAnnouncement(req.user, req.params.id);
  return success(res, true, 'Xóa thông báo thành công');
});
const listLeaves = asyncHandler(async (req, res) => {
  return success(res, await leaveService.listLeaves(req.user, req.query));
});
const createLeave = asyncHandler(async (req, res) => {
  return success(res, await leaveService.createLeave(req.user, req.body), 'Gửi đơn thành công', 201);
});
const reviewLeave = asyncHandler(async (req, res) => {
  return success(res, await leaveService.reviewLeave(req.user, req.params.id, req.body), 'Duyệt đơn thành công');
});
const listTimetables = asyncHandler(async (req, res) => {
  return success(res, await timetableService.listTimetables(req.user, req.query));
});
const upsertTimetable = asyncHandler(async (req, res) => {
  return success(res, await timetableService.upsertTimetable(req.user, req.body), 'Lưu TKB thành công');
});
const approveTimetable = asyncHandler(async (req, res) => {
  return success(res, await timetableService.approveTimetable(req.user, req.params.id), 'Duyệt TKB thành công');
});
const getDashboard = asyncHandler(async (req, res) => {
  return success(res, await dashboardService.getDashboard(req.user));
});
const listNotifications = asyncHandler(async (req, res) => {
  return success(res, await dashboardService.listNotifications(req.user));
});
const markRead = asyncHandler(async (req, res) => {
  return success(res, await dashboardService.markRead(req.user, req.params.id));
});
const markAllRead = asyncHandler(async (req, res) => {
  return success(res, await dashboardService.markAllRead(req.user));
});

const stubNotImplemented = asyncHandler(async (req, res) => {
  return res.status(501).json({
    EC: 501,
    EM: 'Module nâng cao đang phát triển (stub)',
    data: null,
  });
});

module.exports = {
  listUsers,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
  listClusters,
  createCluster,
  updateCluster,
  deleteCluster,
  listSchools,
  createSchool,
  updateSchool,
  deleteSchool,
  listAcademicYears,
  createAcademicYear,
  listClasses,
  createClass,
  updateClass,
  deleteClass,
  listSubjects,
  createSubject,
  updateSubject,
  listAssignments,
  createAssignment,
  deleteAssignment,
  listStudentsInClass,
  listAttendance,
  recordAttendance,
  listGrades,
  upsertGrade,
  addScore,
  listInvoices,
  createInvoice,
  recordPayment,
  listPayments,
  listAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  listLeaves,
  createLeave,
  reviewLeave,
  listTimetables,
  upsertTimetable,
  approveTimetable,
  getDashboard,
  listNotifications,
  markRead,
  markAllRead,
  stubNotImplemented,
};
