const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const service = require('../services/admissionService');

const createPublic = asyncHandler(async (req, res) => success(res, await service.createPublic(req.body), 'Nộp hồ sơ tuyển sinh thành công', 201));
const getPublic = asyncHandler(async (req, res) => success(res, await service.getPublic(req.params.code)));
const list = asyncHandler(async (req, res) => success(res, await service.list(req.user, req.query)));
const review = asyncHandler(async (req, res) => success(res, await service.review(req.user, req.params.id, req.body), 'Cập nhật hồ sơ thành công'));

module.exports = { createPublic, getPublic, list, review };
