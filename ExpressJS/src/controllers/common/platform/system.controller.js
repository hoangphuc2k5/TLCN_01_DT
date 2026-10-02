const responseDto = require('../../../dtos/common/platform/system.dto').response;
const asyncHandler = require("../../../utils/common/http/async-handler.util");
const { success } = require("../../../utils/common/http/response.util");


const stubNotImplemented = asyncHandler(async (req, res) => {
  return res.status(501).json(responseDto.fromPayload({
    EC: 501,
    EM: 'Module nâng cao đang phát triển (stub)',
    data: null,
  }));
});

module.exports = { stubNotImplemented };
