// Keep the established HTTP contract: no coercion, defaults, or unknown-field filtering.
// Validation and authorization continue to run at their existing boundaries.
module.exports = {
  body: req => req.body,
  query: req => req.query,
  params: req => req.params,
};
