const { request: requestDto, response: responseDto } = require('../../dtos/teacher/conduct.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const adminExtraService = require("../../config/container").services["admin-extra"];

const listConduct = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await adminExtraService.listConduct(req.user, requestDto.query(req))));
});

const upsertConduct = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await adminExtraService.upsertConduct(req.user, requestDto.body(req))), 'Lưu hạnh kiểm thành công');
});

module.exports = { listConduct, upsertConduct };
