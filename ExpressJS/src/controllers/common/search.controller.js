const requestDto = require('../../dtos/common/search.request.dto');
const responseDto = require('../../dtos/common/search.response.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const crossService = require("../../config/container").services["cross"];

const search = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await crossService.globalSearch(req.user, requestDto.query(req).q || '')));
});

module.exports = { search };
