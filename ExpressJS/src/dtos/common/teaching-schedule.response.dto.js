const { fromService, fromPayload } = require('./response.dto');

// teaching-schedule owns this boundary; preserve the existing public JSON representation.
module.exports = { fromService, fromPayload };
