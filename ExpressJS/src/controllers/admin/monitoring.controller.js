const responseDto = require('../../dtos/admin/monitoring.dto').response;
const asyncHandler = require("../../utils/common/http/async-handler.util"); const { success } = require("../../utils/common/http/response.util"); const service = require("../../config/container").services["monitoring"];
exports.metrics = asyncHandler(async (req, res) => success(res, responseDto.fromService(await service.getSystemMetrics(req.user))));
