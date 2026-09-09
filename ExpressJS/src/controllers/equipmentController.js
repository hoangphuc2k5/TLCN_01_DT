const asyncHandler = require('../utils/asyncHandler'); const { success } = require('../utils/response'); const service = require('../services/equipmentService');
exports.list = asyncHandler(async (req, res) => success(res, await service.listEquipment(req.user, req.query)));
exports.create = asyncHandler(async (req, res) => success(res, await service.createEquipment(req.user, req.body), 'Equipment created', 201));
exports.update = asyncHandler(async (req, res) => success(res, await service.updateEquipment(req.user, req.params.id, req.body), 'Equipment updated'));
exports.listMaintenance = asyncHandler(async (req, res) => success(res, await service.listMaintenance(req.user, req.query)));
exports.createMaintenance = asyncHandler(async (req, res) => success(res, await service.createMaintenance(req.user, req.body), 'Maintenance request created', 201));
exports.updateMaintenance = asyncHandler(async (req, res) => success(res, await service.updateMaintenance(req.user, req.params.id, req.body), 'Maintenance updated'));
