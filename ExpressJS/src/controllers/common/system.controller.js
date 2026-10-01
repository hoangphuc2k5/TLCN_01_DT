const responseDto = require('../../dtos/common/system.dto').response;
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");


const stubNotImplemented = asyncHandler(async (req, res) => {
  return res.status(501).json(responseDto.fromPayload({
    EC: 501,
    EM: 'Module nâng cao đang phát triển (stub)',
    data: null,
  }));
});

module.exports = { stubNotImplemented };
