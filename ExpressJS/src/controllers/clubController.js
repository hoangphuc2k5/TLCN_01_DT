const asyncHandler = require('../utils/asyncHandler'); const { success } = require('../utils/response'); const service = require('../services/clubService');
exports.listClubs = asyncHandler(async (req, res) => success(res, await service.listClubs(req.user)));
exports.createClub = asyncHandler(async (req, res) => success(res, await service.createClub(req.user, req.body), 'Da tao CLB', 201));
exports.register = asyncHandler(async (req, res) => success(res, await service.register(req.user, req.params.id), 'Da dang ky CLB', 201));
exports.cancel = asyncHandler(async (req, res) => success(res, await service.cancelRegistration(req.user, req.params.id), 'Da huy dang ky'));
exports.registrations = asyncHandler(async (req, res) => success(res, await service.listRegistrations(req.user)));
exports.retakes = asyncHandler(async (req, res) => success(res, await service.listRetakes(req.user)));
exports.createRetake = asyncHandler(async (req, res) => success(res, await service.createRetake(req.user, req.body), 'Da gui yeu cau', 201));
exports.reviewRetake = asyncHandler(async (req, res) => success(res, await service.reviewRetake(req.user, req.params.id, req.body), 'Da xu ly yeu cau'));
