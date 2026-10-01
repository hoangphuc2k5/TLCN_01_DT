const { fromService, fromPayload } = require('./response.dto');

// platform owns this boundary; preserve the existing public JSON representation.
module.exports = { fromService, fromPayload };
