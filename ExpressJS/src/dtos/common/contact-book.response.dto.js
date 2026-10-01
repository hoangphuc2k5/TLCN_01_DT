const { fromService, fromPayload } = require('./response.dto');

// contact-book owns this boundary; preserve the existing public JSON representation.
module.exports = { fromService, fromPayload };
