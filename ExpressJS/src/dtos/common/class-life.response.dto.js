const { fromService, fromPayload } = require('./response.dto');

// class-life owns this boundary; preserve the existing public JSON representation.
module.exports = { fromService, fromPayload };
