// JSON serialization deliberately honors model toJSON transforms (including populated
// documents), ObjectIds, dates, omitted undefined fields, and JSON array semantics.
// The data wrapper preserves the toJSON key used by the existing response envelope.
const fromService = value => JSON.parse(JSON.stringify({ data: value })).data;
const fromPayload = value => {
  const json = JSON.stringify(value);
  return json === undefined ? undefined : JSON.parse(json);
};

module.exports = { fromService, fromPayload };
