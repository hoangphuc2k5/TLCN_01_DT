const requestDto = require('../../dtos/common/library.request.dto');
const responseDto = require('../../dtos/common/library.response.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const resourceService = require("../../config/container").services["resource"];

const listBooks = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await resourceService.listBooks(req.user, requestDto.query(req))));
});

const createBook = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await resourceService.createBook(req.user, requestDto.body(req))), 'Thêm sách thành công', 201);
});

const updateBook = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await resourceService.updateBook(req.user, requestDto.params(req).id, requestDto.body(req))), 'Cập nhật sách thành công');
});

const borrowBook = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await resourceService.borrowBook(req.user, requestDto.body(req))), 'Cho mượn thành công', 201);
});

const returnBook = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await resourceService.returnBook(req.user, requestDto.params(req).id)), 'Trả sách thành công');
});

const listLoans = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await resourceService.listLoans(req.user, requestDto.query(req))));
});

module.exports = { listBooks, createBook, updateBook, borrowBook, returnBook, listLoans };
