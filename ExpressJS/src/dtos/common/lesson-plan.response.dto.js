const { fromService, fromPayload } = require('./response.dto');

// lesson-plan owns this boundary; preserve the existing public JSON representation.
module.exports = { fromService, fromPayload };
