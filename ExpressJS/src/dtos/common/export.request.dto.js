const request = require('./request.dto');

// export accepts the existing request fields without narrowing the API.
module.exports = { body: request.body, query: request.query, params: request.params };
