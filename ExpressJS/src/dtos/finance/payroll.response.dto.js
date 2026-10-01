const { fromService, fromPayload } = require('../common/response.dto');

// payroll owns this boundary; preserve the existing public JSON representation.
module.exports = { fromService, fromPayload };
