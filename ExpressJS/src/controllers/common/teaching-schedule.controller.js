const requestDto = require('../../dtos/common/teaching-schedule.request.dto');
const responseDto = require('../../dtos/common/teaching-schedule.response.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");


const datedSchedule = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await require("../../config/container").services["teaching-schedule"].schedule(req.user, requestDto.query(req))));
});

module.exports = { datedSchedule };
