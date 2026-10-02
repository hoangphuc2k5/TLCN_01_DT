const { request: requestDto, response: responseDto } = require('../../../dtos/common/platform/dashboard.dto');
const asyncHandler = require("../../../utils/common/http/async-handler.util");
const { success } = require("../../../utils/common/http/response.util");
const dashboardService = require("../../../config/container").services["dashboard"];

const getDashboard = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await dashboardService.getDashboard(req.user)));
});

const listNotifications = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await dashboardService.listNotifications(req.user)));
});

const markRead = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await dashboardService.markRead(req.user, requestDto.params(req).id)));
});

const markAllRead = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await dashboardService.markAllRead(req.user)));
});

module.exports = { getDashboard, listNotifications, markRead, markAllRead };
