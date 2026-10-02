const { request: requestDto, response: responseDto } = require('../../../dtos/common/platform/search.dto');
const asyncHandler = require("../../../utils/common/http/async-handler.util");
const { success } = require("../../../utils/common/http/response.util");
const crossService = require("../../../config/container").services["cross"];

const search = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await crossService.globalSearch(req.user, requestDto.query(req).q || '')));
});

module.exports = { search };
