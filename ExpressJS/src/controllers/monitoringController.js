const asyncHandler = require('../utils/asyncHandler'); const { success } = require('../utils/response'); const service = require('../services/monitoringService');
exports.metrics = asyncHandler(async (req, res) => success(res, await service.getSystemMetrics(req.user)));
