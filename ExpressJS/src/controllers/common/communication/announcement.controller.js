const { request: requestDto, response: responseDto } = require('../../../dtos/common/communication/announcement.dto');
const asyncHandler = require("../../../utils/common/http/async-handler.util");
const { success } = require("../../../utils/common/http/response.util");
const announcementService = require("../../../config/container").services["announcement"];

const listAnnouncements = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await announcementService.listAnnouncements(req.user, requestDto.query(req))));
});

const createAnnouncement = asyncHandler(async (req, res) => {
  return success(res, responseDto.fromService(await announcementService.createAnnouncement(req.user, requestDto.body(req))), 'Gửi thông báo thành công', 201);
});

const deleteAnnouncement = asyncHandler(async (req, res) => {
  await announcementService.deleteAnnouncement(req.user, requestDto.params(req).id);
  return success(res, responseDto.fromService(true), 'Xóa thông báo thành công');
});

module.exports = { listAnnouncements, createAnnouncement, deleteAnnouncement };
