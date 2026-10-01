const { fromService, fromPayload } = require('../common/response.dto');

// user owns this boundary; preserve the existing public JSON representation.
module.exports = { fromService, fromPayload };
