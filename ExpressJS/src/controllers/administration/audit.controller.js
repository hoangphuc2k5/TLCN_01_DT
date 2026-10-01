const requestDto = require('../../dtos/administration/audit.request.dto');
const responseDto = require('../../dtos/administration/audit.response.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const adminExtraService = require("../../config/container").services["admin-extra"];

const listAuditLogs = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await adminExtraService.listAuditLogs(req.user, requestDto.query(req))));
});

module.exports = { listAuditLogs };
