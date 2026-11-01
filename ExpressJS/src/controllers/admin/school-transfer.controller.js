const asyncHandler = require('../../utils/common/http/async-handler.util');
const { success } = require('../../utils/common/http/response.util');
const service = require('../../config/container').services['school-transfer'];
module.exports = {
  schools: asyncHandler(async (req, res) => success(res, await service.schools(req.user))),
  list: asyncHandler(async (req, res) => success(res, await service.list(req.user))),
  detail: asyncHandler(async (req, res) => success(res, await service.detail(req.user, req.params.id))),
  create: asyncHandler(async (req, res) => success(res, await service.create(req.user, req.body), 'Đã tạo yêu cầu chuyển trường', 201)),
  decide: asyncHandler(async (req, res) => success(res, await service.decide(req.user, req.params.id, req.body), 'Đã xử lý yêu cầu chuyển trường')),
};
