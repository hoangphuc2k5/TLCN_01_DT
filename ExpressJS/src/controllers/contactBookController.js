const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const service = require('../services/contactBookService');

exports.list = asyncHandler(async (req, res) => success(res, await service.list(req.user, req.query)));
exports.get = asyncHandler(async (req, res) => success(res, await service.get(req.user, req.params.id)));
exports.create = asyncHandler(async (req, res) => success(res, await service.create(req.user, req.body), 'Da tao so lien lac', 201));
exports.update = asyncHandler(async (req, res) => success(res, await service.update(req.user, req.params.id, req.body), 'Da cap nhat so lien lac'));
exports.publish = asyncHandler(async (req, res) => success(res, await service.publish(req.user, req.params.id), 'Da cong bo so lien lac'));
exports.reply = asyncHandler(async (req, res) => success(res, await service.reply(req.user, req.params.id, req.body.parentReply), 'Da gui phan hoi'));
