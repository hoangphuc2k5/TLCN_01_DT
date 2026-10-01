const { fromService, fromPayload } = require('./response.dto');

// admission owns this boundary; preserve the existing public JSON representation.
module.exports = { fromService, fromPayload };
