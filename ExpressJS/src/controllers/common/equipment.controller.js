const requestDto = require('../../dtos/common/equipment.request.dto');
const responseDto = require('../../dtos/common/equipment.response.dto');
const asyncHandler = require("../../utils/common/async-handler.util"); const { success } = require("../../utils/common/response.util"); const service = require("../../config/container").services["equipment"];
exports.list = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.listEquipment(req.user, requestDto.query(req)))));
exports.create = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.createEquipment(req.user, requestDto.body(req))), 'Equipment created', 201));
exports.update = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.updateEquipment(req.user, requestDto.params(req).id, requestDto.body(req))), 'Equipment updated'));
exports.listMaintenance = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.listMaintenance(req.user, requestDto.query(req)))));
exports.createMaintenance = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.createMaintenance(req.user, requestDto.body(req))), 'Maintenance request created', 201));
exports.updateMaintenance = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.updateMaintenance(req.user, requestDto.params(req).id, requestDto.body(req))), 'Maintenance updated'));
