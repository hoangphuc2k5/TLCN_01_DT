const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const service = require('../services/lessonPlanService');

const list = asyncHandler(async (req, res) => success(res, await service.list(req.user, req.query)));
const get = asyncHandler(async (req, res) => success(res, await service.get(req.user, req.params.id)));
const create = asyncHandler(async (req, res) => success(res, await service.create(req.user, req.body), 'Tạo giáo án thành công', 201));
const update = asyncHandler(async (req, res) => success(res, await service.update(req.user, req.params.id, req.body), 'Cập nhật giáo án thành công'));
const submit = asyncHandler(async (req, res) => success(res, await service.submit(req.user, req.params.id), 'Đã gửi giáo án chờ duyệt'));
const review = asyncHandler(async (req, res) => success(res, await service.review(req.user, req.params.id, req.body), 'Đã xử lý giáo án'));
const remove = asyncHandler(async (req, res) => success(res, await service.remove(req.user, req.params.id), 'Đã xóa giáo án'));

module.exports = { list, get, create, update, submit, review, remove };
