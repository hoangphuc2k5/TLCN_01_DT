const request = require('../common/shared/request.dto');
const { fromService, fromPayload } = require('../common/shared/response.dto');

// class-life accepts the existing request fields without narrowing the API.
// class-life owns this boundary; preserve the existing public JSON representation.
module.exports = {
  request: { body: request.body, query: request.query, params: request.params },
  response: { fromService, fromPayload },
};
