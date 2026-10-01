const { fromService, fromPayload } = require('./response.dto');

// online-payment owns this boundary; preserve the existing public JSON representation.
module.exports = { fromService, fromPayload };
