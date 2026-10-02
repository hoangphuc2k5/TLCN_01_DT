const request = require('../common/shared/request.dto');
const { fromService, fromPayload } = require('../common/shared/response.dto');

// timetable accepts the existing request fields without narrowing the API.
// timetable owns this boundary; preserve the existing public JSON representation.
module.exports = {
  request: { body: request.body, query: request.query, params: request.params },
  response: { fromService, fromPayload },
};
