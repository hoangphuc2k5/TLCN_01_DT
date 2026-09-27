const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

Object.assign(process.env, {
  NODE_ENV: 'test',
  FRONTEND_URL: 'https://school.example.test/',
  CORS_ALLOWED_ORIGINS: 'https://admin.example.test',
});

const app = require('../src/app');
const ApiError = require('../src/utils/ApiError');
const { errorHandler } = require('../src/middleware/errorHandler');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
});

test('CORS only permits configured browser origins and keeps server requests usable', async () => {
  for (const origin of ['https://school.example.test', 'https://admin.example.test']) {
    const response = await fetch(baseUrl, { headers: { Origin: origin } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
    assert.ok(response.headers.get('content-security-policy'));
  }

  const denied = await fetch(baseUrl, { headers: { Origin: 'https://untrusted.example.test' } });
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
  assert.equal(denied.headers.get('access-control-allow-credentials'), null);

  const preflight = await fetch(baseUrl, {
    method: 'OPTIONS',
    headers: { Origin: 'https://untrusted.example.test', 'Access-Control-Request-Method': 'POST' },
  });
  assert.equal(preflight.headers.get('access-control-allow-origin'), null);

  const serverRequest = await fetch(baseUrl);
  assert.equal(serverRequest.status, 200);
});

test('production errors hide internal details but preserve expected client errors', () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldConsoleError = console.error;
  process.env.NODE_ENV = 'production';
  console.error = () => {};
  const respond = error => {
    const response = {
      headersSent: false,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    errorHandler(error, {}, response, () => {});
    return response;
  };
  try {
    const unexpected = respond(new Error('database password and internal details'));
    assert.equal(unexpected.statusCode, 500);
    assert.deepEqual(unexpected.body, { EC: 1, EM: 'Internal Server Error', data: null });

    const expected = respond(new ApiError(403, 'Không có quyền'));
    assert.equal(expected.statusCode, 403);
    assert.equal(expected.body.EM, 'Không có quyền');
  } finally {
    process.env.NODE_ENV = oldNodeEnv;
    console.error = oldConsoleError;
  }
});
