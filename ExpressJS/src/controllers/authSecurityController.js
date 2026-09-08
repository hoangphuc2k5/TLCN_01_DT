const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const security = require('../services/authSecurityService');
const throttle = require('../services/authThrottle');

const noStore = (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); };
const limit = asyncHandler(async (req, _res, next) => { await throttle.consume('ip', req.ip, 120); next(); });
const handler = operation => asyncHandler(async (req, res) => success(res, await operation(req), 'Thành công'));
module.exports = {
  noStore, limit,
  status: handler(async req => security.statusOf(await security.activeUser(req.user._id))),
  verify: handler(req => security.verifyLogin(req.body)),
  setup: handler(req => security.startSetup(req.user._id, req.body)),
  confirm: handler(req => security.confirmSetup(req.user._id, req.body)),
  disable: handler(req => security.changeFactors(req.user._id, req.body, true)),
  recovery: handler(req => security.changeFactors(req.user._id, req.body, false)),
  password: handler(req => security.changePassword(req.user._id, req.body)),
};
