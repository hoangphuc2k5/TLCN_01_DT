const { test } = require('node:test');
const assert = require('node:assert/strict');
const logger = require('../../../config/logger/logger.config');

test('logger imports share one immutable instance', () => {
  assert.equal(logger, require('../../../config/logger/logger.config'));
  assert.equal(Object.isFrozen(logger), true);
});

test('logger forwards every argument to the corresponding console method', t => {
  for (const method of ['log', 'info', 'warn', 'error', 'debug']) {
    const calls = [];
    t.mock.method(console, method, function (...args) {
      assert.equal(this, console);
      calls.push(args);
    });
    const detail = new Error('original error');
    logger[method]('[message]', detail, { count: 1 });
    assert.deepEqual(calls, [['[message]', detail, { count: 1 }]]);
  }
});
