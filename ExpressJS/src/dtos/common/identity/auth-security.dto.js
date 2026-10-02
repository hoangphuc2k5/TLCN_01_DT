const request = require('../shared/request.dto');
const { fromService, fromPayload } = require('../shared/response.dto');

// auth-security accepts the existing request fields without narrowing the API.
// auth-security owns this boundary; preserve the existing public JSON representation.
module.exports = {
  request: { body: request.body, query: request.query, params: request.params },
  response: { fromService, fromPayload },
};
