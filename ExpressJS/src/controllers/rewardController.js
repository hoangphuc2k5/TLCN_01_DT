const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const service = require('../services/rewardService');

const list = asyncHandler(async (req, res) => success(res, await service.list(req.user, req.query)));
const create = asyncHandler(async (req, res) => success(res, await service.create(req.user, req.body), 'Tạo bản ghi thành công', 201));
const review = asyncHandler(async (req, res) => success(res, await service.review(req.user, req.params.id, req.body), 'Duyệt bản ghi thành công'));

module.exports = { list, create, review };
