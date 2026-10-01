const request = require('./request.dto');

// reward accepts the existing request fields without narrowing the API.
module.exports = { body: request.body, query: request.query, params: request.params };
