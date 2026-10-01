const { fromService, fromPayload } = require('./response.dto');

// grade owns this boundary; preserve the existing public JSON representation.
module.exports = { fromService, fromPayload };
