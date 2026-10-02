const { request: requestDto, response: responseDto } = require('../../dtos/admin/academic.dto');
const asyncHandler = require("../../utils/common/http/async-handler.util");
const { success } = require("../../utils/common/http/response.util");
const academicService = require("../../config/container").services["academic"];

const listAcademicYears = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await academicService.listAcademicYears(req.user, requestDto.query(req))));
});

const createAcademicYear = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await academicService.createAcademicYear(req.user, requestDto.body(req))), 'Tạo năm học thành công', 201);
});

const listClasses = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await academicService.listClasses(req.user, requestDto.query(req))));
});

const createClass = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await academicService.createClass(req.user, requestDto.body(req))), 'Tạo lớp thành công', 201);
});

const updateClass = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await academicService.updateClass(req.user, requestDto.params(req).id, requestDto.body(req))), 'Cập nhật lớp thành công');
});

const deleteClass = asyncHandler(async (req, res) => {
  await academicService.deleteClass(req.user, requestDto.params(req).id);
  return success(res, responseDto.fromService(true), 'Xóa lớp thành công');
});

const listSubjects = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await academicService.listSubjects(req.user, requestDto.query(req))));
});

const createSubject = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await academicService.createSubject(req.user, requestDto.body(req))), 'Tạo môn thành công', 201);
});

const updateSubject = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await academicService.updateSubject(req.user, requestDto.params(req).id, requestDto.body(req))), 'Cập nhật môn thành công');
});

const listAssignments = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await academicService.listAssignments(req.user, requestDto.query(req))));
});

const createAssignment = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await academicService.createAssignment(req.user, requestDto.body(req))), 'Phân công thành công', 201);
});

const deleteAssignment = asyncHandler(async (req, res) => {
  await academicService.deleteAssignment(req.user, requestDto.params(req).id);
  return success(res, responseDto.fromService(true), 'Xóa phân công thành công');
});

const listStudentsInClass = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await academicService.listStudentsInClass(req.user, requestDto.params(req).id)));
});

module.exports = { listAcademicYears, createAcademicYear, listClasses, createClass, updateClass, deleteClass, listSubjects, createSubject, updateSubject, listAssignments, createAssignment, deleteAssignment, listStudentsInClass };
