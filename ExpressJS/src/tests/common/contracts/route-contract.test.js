const { test } = require('node:test');
const assert = require('node:assert/strict');
const sourceFixture = require('./route-contract.fixture.json');
const router = require('../../../routes/common/shared/api.routes');

const expected = [...sourceFixture.join('\n').matchAll(/router\.(get|post|put|patch|delete)\(\s*(\[[^\]]+\]|'[^']+')/g)].flatMap(match => {
  const paths = match[2].startsWith('[')
    ? [...match[2].matchAll(/'([^']+)'/g)].map(item => item[1])
    : [match[2].slice(1, -1)];
  return paths.map(path => `${match[1].toUpperCase()} ${path}`);
});

const actual = router.stack.flatMap(layer => {
  if (!layer.route) return [];
  const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
  const methods = Object.keys(layer.route.methods).map(method => method.toUpperCase());
  return paths.flatMap(path => methods.map(method => `${method} ${path}`));
});

test('feature route modules preserve every HTTP method/path and registration order', () => {
  assert.deepEqual(actual, expected);
});
