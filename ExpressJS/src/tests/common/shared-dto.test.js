const { test } = require('node:test');
const assert = require('node:assert/strict');
const requestDto = require('../../dtos/common/request.dto');
const responseDto = require('../../dtos/common/response.dto');

test('request DTO preserves the established body, query and params values', () => {
  const request = { body: { unknown: 1 }, query: { page: '2' }, params: { id: 'abc' } };
  assert.equal(requestDto.body(request), request.body);
  assert.equal(requestDto.query(request), request.query);
  assert.equal(requestDto.params(request), request.params);
});

test('response DTO honors toJSON and normal JSON omission rules', () => {
  const value = {
    visible: true,
    omitted: undefined,
    nested: { toJSON: () => ({ transformed: 'yes', secret: undefined }) },
  };
  assert.deepEqual(responseDto.fromService(value), {
    visible: true,
    nested: { transformed: 'yes' },
  });
});

test('response DTO preserves undefined payload semantics', () => {
  assert.equal(responseDto.fromPayload(undefined), undefined);
});
