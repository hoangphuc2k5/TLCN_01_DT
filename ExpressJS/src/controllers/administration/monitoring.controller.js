const responseDto = require('../../dtos/administration/monitoring.response.dto');
const asyncHandler = require("../../utils/common/async-handler.util"); const { success } = require("../../utils/common/response.util"); const service = require("../../config/container").services["monitoring"];
exports.metrics = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.getSystemMetrics(req.user))));
