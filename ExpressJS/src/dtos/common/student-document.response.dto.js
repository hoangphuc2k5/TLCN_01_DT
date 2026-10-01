const { fromService, fromPayload } = require('./response.dto');

// student-document owns this boundary; preserve the existing public JSON representation.
module.exports = { fromService, fromPayload };
