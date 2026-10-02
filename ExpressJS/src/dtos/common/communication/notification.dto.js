const request = require('../shared/request.dto');
const { fromService, fromPayload } = require('../shared/response.dto');

// notification accepts the existing request fields without narrowing the API.
// notification owns this boundary; preserve the existing public JSON representation.
module.exports = {
  request: { body: request.body, query: request.query, params: request.params },
  response: { fromService, fromPayload },
};
