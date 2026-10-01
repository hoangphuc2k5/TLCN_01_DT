const request = require('../common/request.dto');
const { fromService, fromPayload } = require('../common/response.dto');

// contact-book accepts the existing request fields without narrowing the API.
// contact-book owns this boundary; preserve the existing public JSON representation.
module.exports = {
  request: { body: request.body, query: request.query, params: request.params },
  response: { fromService, fromPayload },
};
