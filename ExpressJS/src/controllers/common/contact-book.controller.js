const requestDto = require('../../dtos/common/contact-book.request.dto');
const responseDto = require('../../dtos/common/contact-book.response.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const service = require("../../config/container").services["contact-book"];

exports.list = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.list(req.user, requestDto.query(req)))));
exports.get = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.get(req.user, requestDto.params(req).id))));
exports.create = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.create(req.user, requestDto.body(req))), 'Da tao so lien lac', 201));
exports.update = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.update(req.user, requestDto.params(req).id, requestDto.body(req))), 'Da cap nhat so lien lac'));
exports.publish = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.publish(req.user, requestDto.params(req).id)), 'Da cong bo so lien lac'));
exports.reply = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.reply(req.user, requestDto.params(req).id, requestDto.body(req).parentReply)), 'Da gui phan hoi'));
