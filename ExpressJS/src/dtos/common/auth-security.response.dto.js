const { fromService, fromPayload } = require('./response.dto');

// auth-security owns this boundary; preserve the existing public JSON representation.
module.exports = { fromService, fromPayload };
