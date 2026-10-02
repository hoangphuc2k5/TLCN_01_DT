const { request: requestDto, response: responseDto } = require('../../dtos/admin/audit.dto');
const asyncHandler = require("../../utils/common/http/async-handler.util");
const { success } = require("../../utils/common/http/response.util");
const adminExtraService = require("../../config/container").services["admin-extra"];

const listAuditLogs = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await adminExtraService.listAuditLogs(req.user, requestDto.query(req))));
});

module.exports = { listAuditLogs };
