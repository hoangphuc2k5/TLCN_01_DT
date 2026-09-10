const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { WebSocket } = require('ws');
const { MongoMemoryServer } = require('mongodb-memory-server');

Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: 'message-realtime-test-secret' });
const app = require('../src/app');
const { attachMessageGateway } = require('../src/realtime/messageGateway');
const cache = require('../src/services/rolePermissionCache');
const { ROLE_PERMISSIONS } = require('../src/constants/permissions');
const { legacyPermissionsToEntries, DEFAULT_ROLE_LEVELS } = require('../src/constants/permissionCatalog');
const Role = require('../src/models/Role');
const School = require('../src/models/School');
const User = require('../src/models/User');
const Message = require('../src/models/Message');

let mongo, server, gateway, origin, wsOrigin, school, foreignSchool, actors;
const token = actor => jwt.sign({ _id: actor._id }, process.env.JWT_SECRET);
const api = async (method, path, actor, body) => {
  const response = await fetch(`${origin}/v1/api${path}`, {
    method, headers: { Authorization: `Bearer ${token(actor)}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, ...(await response.json()) };
};
const ticket = async actor => {
  const response = await api('POST', '/messages/realtime-ticket', actor);
  assert.equal(response.status, 200, response.EM);
  return response.data.ticket;
};
const connect = async (actor, cursor = '') => {
  const value = await ticket(actor);
  const url = `${wsOrigin}/v1/ws/messages?ticket=${encodeURIComponent(value)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
  const socket = new WebSocket(url);
  socket.realtimeEvents = [];
  socket.on('message', bytes => socket.realtimeEvents.push(JSON.parse(bytes.toString())));
  await once(socket, 'open');
  return socket;
};
const waitForEvent = (socket, type, timeoutMs = 1000) => new Promise((resolve, reject) => {
  const queuedIndex = socket.realtimeEvents.findIndex(event => event.type === type);
  if (queuedIndex >= 0) return resolve(socket.realtimeEvents.splice(queuedIndex, 1)[0]);
  const timeout = setTimeout(() => { socket.off('message', onMessage); reject(new Error(`Timed out waiting for ${type}`)); }, timeoutMs);
  const onMessage = bytes => {
    const event = JSON.parse(bytes.toString());
    if (event.type !== type) return;
    clearTimeout(timeout); socket.off('message', onMessage); resolve(event);
  };
  socket.on('message', onMessage);
});

before(async () => {
  mongo = await MongoMemoryServer.create(); await mongoose.connect(mongo.getUri());
  await Role.create(Object.entries(ROLE_PERMISSIONS).map(([code, keys]) => ({ code, name: code, level: DEFAULT_ROLE_LEVELS[code], permissions: legacyPermissionsToEntries(keys) })));
  await cache.reload();
  school = await School.create({ name: 'Realtime School', code: 'RTS', subdomain: 'rts' });
  foreignSchool = await School.create({ name: 'Foreign Realtime School', code: 'RTF', subdomain: 'rtf' });
  actors = {
    sender: await User.create({ name: 'Sender', email: 'sender@realtime.invalid', role: 'SUBJECT_TEACHER', schoolId: school._id }),
    receiver: await User.create({ name: 'Receiver', email: 'receiver@realtime.invalid', role: 'STUDENT', schoolId: school._id }),
    other: await User.create({ name: 'Other', email: 'other@realtime.invalid', role: 'STUDENT', schoolId: school._id }),
    foreign: await User.create({ name: 'Foreign', email: 'foreign@realtime.invalid', role: 'STUDENT', schoolId: foreignSchool._id }),
  };
  server = http.createServer(app); gateway = attachMessageGateway(server); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`; wsOrigin = `ws://127.0.0.1:${server.address().port}`;
});
beforeEach(async () => Message.deleteMany({}));
after(async () => {
  gateway?.close(); if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect(); if (mongo) await mongo.stop();
});

test('live message events are delivered only to the two conversation participants', async () => {
  const senderSocket = await connect(actors.sender); const receiverSocket = await connect(actors.receiver); const otherSocket = await connect(actors.other);
  try {
    const senderEvent = waitForEvent(senderSocket, 'message.created');
    const receiverEvent = waitForEvent(receiverSocket, 'message.created');
    let leaked = false; otherSocket.on('message', bytes => { if (JSON.parse(bytes.toString()).type === 'message.created') leaked = true; });
    const response = await api('POST', '/messages', actors.sender, { receiverId: actors.receiver._id, subject: 'Realtime', body: 'Tin nhắn trực tiếp.' });
    assert.equal(response.status, 201, response.EM);
    const [sent, received] = await Promise.all([senderEvent, receiverEvent]);
    assert.equal(sent.message._id, response.data._id); assert.equal(received.message._id, response.data._id);
    await new Promise(resolve => setTimeout(resolve, 100)); assert.equal(leaked, false);
    assert.equal((await api('POST', '/messages', actors.sender, { receiverId: actors.foreign._id, body: 'Không hợp lệ' })).status, 403);
  } finally { senderSocket.close(); receiverSocket.close(); otherSocket.close(); }
});

test('reconnect cursor replays missed messages without leaking another conversation', async () => {
  const baseline = await api('POST', '/messages', actors.sender, { receiverId: actors.receiver._id, body: 'Mốc đồng bộ' });
  await api('POST', '/messages', actors.other, { receiverId: actors.sender._id, body: 'Hội thoại khác' });
  const missed = await api('POST', '/messages', actors.sender, { receiverId: actors.receiver._id, body: 'Tin bị lỡ' });
  const socket = await connect(actors.receiver, baseline.data._id);
  try {
    const replay = await waitForEvent(socket, 'message.created');
    assert.equal(replay.replay, true); assert.equal(replay.message._id, missed.data._id);
  } finally { socket.close(); }
});

test('revoking the login session invalidates an already issued realtime ticket', async () => {
  const value = await ticket(actors.receiver);
  await User.updateOne({ _id: actors.receiver._id }, { $inc: { 'security.sessionVersion': 1 } });
  const socket = new WebSocket(`${wsOrigin}/v1/ws/messages?ticket=${encodeURIComponent(value)}`);
  const [, response] = await once(socket, 'unexpected-response');
  assert.equal(response.statusCode, 401);
});
