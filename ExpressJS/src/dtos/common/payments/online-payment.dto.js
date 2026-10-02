const request = require('../shared/request.dto');
const { fromService, fromPayload } = require('../shared/response.dto');

// online-payment accepts the existing request fields without narrowing the API.
// online-payment owns this boundary; preserve the existing public JSON representation.
module.exports = {
  request: { body: request.body, query: request.query, params: request.params },
  response: { fromService, fromPayload },
};
