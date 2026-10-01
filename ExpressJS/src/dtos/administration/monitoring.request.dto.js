const request = require('../common/request.dto');

// monitoring accepts the existing request fields without narrowing the API.
module.exports = { body: request.body, query: request.query, params: request.params };
