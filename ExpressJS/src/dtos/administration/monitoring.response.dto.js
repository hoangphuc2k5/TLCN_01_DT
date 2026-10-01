const { fromService, fromPayload } = require('../common/response.dto');

// monitoring owns this boundary; preserve the existing public JSON representation.
module.exports = { fromService, fromPayload };
