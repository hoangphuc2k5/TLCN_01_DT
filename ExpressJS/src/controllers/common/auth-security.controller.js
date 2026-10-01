const requestDto = require('../../dtos/common/auth-security.request.dto');
const responseDto = require('../../dtos/common/auth-security.response.dto');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const security = require("../../config/container").services["auth-security"];
const throttle = require("../../config/container").services["auth-throttle"];

const noStore = (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); };
const limit = asyncHandler(async (req, _res, next) => { await throttle.consume('ip', req.ip, 120); next(); });
const handler = operation => asyncHandler(async (req, res) => success(res, responseDto.fromService(await operation(req)), 'Thành công'));
module.exports = {
  noStore, limit,
  status: handler(async req => security.statusOf(await security.activeUser(req.user._id))),
  verify: handler(req => security.verifyLogin(requestDto.body(req))),
  setup: handler(req => security.startSetup(req.user._id, requestDto.body(req))),
  confirm: handler(req => security.confirmSetup(req.user._id, requestDto.body(req))),
  disable: handler(req => security.changeFactors(req.user._id, requestDto.body(req), true)),
  recovery: handler(req => security.changeFactors(req.user._id, requestDto.body(req), false)),
  password: handler(req => security.changePassword(req.user._id, requestDto.body(req))),
};
