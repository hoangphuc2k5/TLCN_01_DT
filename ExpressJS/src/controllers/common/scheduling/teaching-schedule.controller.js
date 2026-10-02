const { request: requestDto, response: responseDto } = require('../../../dtos/common/scheduling/teaching-schedule.dto');
const asyncHandler = require("../../../utils/common/http/async-handler.util");
const { success } = require("../../../utils/common/http/response.util");


const datedSchedule = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await require("../../../config/container").services["teaching-schedule"].schedule(req.user, requestDto.query(req))));
});

module.exports = { datedSchedule };
