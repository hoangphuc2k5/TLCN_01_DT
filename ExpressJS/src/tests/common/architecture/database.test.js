const { test } = require('node:test');
const assert = require('node:assert/strict');
const connection = require('../../../config/database/database.config');

function fixture({ connected = false, uri = 'mongodb://example/test' } = {}) {
  const calls = [];
  const db = {};
  const mongoose = {
    connection: { readyState: connected ? 1 : 0, db },
    mongo: { MongoClient: class {
      constructor(value) { calls.push(['probe', value]); }
      async connect() { calls.push(['probe.connect']); }
      db() { return db; }
      async close() { calls.push(['probe.close']); }
    } },
    async connect(value) { calls.push(['connect', value]); this.connection.readyState = 1; },
  };
  const options = {
    mongoose, env: { MONGO_DB_URL: uri },
    assertUsable: async value => { assert.equal(value, db); calls.push(['guard']); },
    logger: { log() {} },
  };
  return { calls, mongoose, options };
}

test('default database connector is a module singleton', () => {
  assert.equal(connection, require('../../../config/database/database.config'));
});

test('concurrent calls share a guarded connection attempt and reuse its connection', async () => {
  const { calls, mongoose, options } = fixture();
  const connect = connection.createConnection(options);
  const first = connect();
  const second = connect();
  assert.equal(first, second);
  assert.equal(await first, mongoose.connection);
  assert.deepEqual(calls, [['probe', options.env.MONGO_DB_URL], ['probe.connect'], ['guard'], ['probe.close'], ['connect', options.env.MONGO_DB_URL]]);
  assert.equal(await connect(), mongoose.connection);
  assert.deepEqual(calls.at(-1), ['guard']);
  assert.equal(calls.filter(([name]) => name === 'connect').length, 1);
});

test('a failed restore guard closes the probe, prevents Mongoose connecting and permits retry', async () => {
  const { calls, mongoose, options } = fixture();
  const failure = new Error('restore incomplete');
  let blocked = true;
  options.assertUsable = async () => { if (blocked) throw failure; };
  const connect = connection.createConnection(options);
  await assert.rejects(connect(), error => error === failure);
  assert.deepEqual(calls, [['probe', options.env.MONGO_DB_URL], ['probe.connect'], ['probe.close']]);
  blocked = false;
  assert.equal(await connect(), mongoose.connection);
});

test('a rejected Mongoose connection is shared and can be retried', async () => {
  const { mongoose, options } = fixture();
  const failure = new Error('connection unavailable');
  let attempts = 0;
  mongoose.connect = async () => { if (++attempts === 1) throw failure; mongoose.connection.readyState = 1; };
  const connect = connection.createConnection(options);
  const first = connect();
  assert.equal(first, connect());
  await assert.rejects(first, error => error === failure);
  assert.equal(await connect(), mongoose.connection);
  assert.equal(attempts, 2);
});

test('an existing connection still fails closed when its restore guard rejects', async () => {
  const { calls, options } = fixture({ connected: true });
  const failure = new Error('restore incomplete');
  options.assertUsable = async () => { throw failure; };
  await assert.rejects(connection.createConnection(options)(), error => error === failure);
  assert.deepEqual(calls, []);
});

test('missing URI rejects before inspecting or opening connections', async () => {
  const { calls, options } = fixture({ connected: true, uri: '' });
  await assert.rejects(connection.createConnection(options)(), /MONGO_DB_URL is missing/);
  assert.deepEqual(calls, []);
});
