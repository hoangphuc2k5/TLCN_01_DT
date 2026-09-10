const { WebSocketServer, WebSocket } = require('ws');
const eventBus = require('../patterns/eventBus');
const realtime = require('../services/messageRealtimeService');

const rejectUpgrade = (socket, status = 401) => {
  if (!socket.destroyed) socket.end(`HTTP/1.1 ${status} Unauthorized\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
};

const attachMessageGateway = server => {
  const clients = new Map();
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
  const addClient = (userId, socket) => {
    const key = String(userId); const group = clients.get(key) || new Set();
    group.add(socket); clients.set(key, group);
    socket.once('close', () => { group.delete(socket); if (!group.size) clients.delete(key); });
  };
  const send = (socket, payload) => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
  };
  const onCreated = message => {
    const payload = realtime.serializeEvent(message);
    for (const userId of new Set([payload.message.senderId, payload.message.receiverId])) {
      for (const socket of clients.get(userId) || []) send(socket, payload);
    }
  };
  const onUpgrade = async (request, socket, head) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname !== '/v1/ws/messages') return rejectUpgrade(socket, 404);
      const user = await realtime.authenticateTicket(url.searchParams.get('ticket') || '');
      const cursor = url.searchParams.get('cursor') || '';
      wss.handleUpgrade(request, socket, head, client => {
        addClient(user._id, client);
        void (async () => {
          const through = await realtime.latestMessageId(user._id);
          let replayCursor = cursor; let replayed = 0;
          while (through && replayed < 1000) {
            const missed = await realtime.replayAfter(user._id, replayCursor, through, Math.min(100, 1000 - replayed));
            for (const message of missed) send(client, realtime.serializeEvent(message, true));
            replayed += missed.length;
            if (missed.length) replayCursor = String(missed.at(-1)._id);
            if (missed.length < 100) break;
          }
          if (replayed === 1000 && replayCursor !== String(through)) send(client, { type: 'resync.required' });
          send(client, { type: 'ready', cursor: through ? String(through) : cursor || null });
        })().catch(() => client.close(1011, 'Replay unavailable'));
      });
    } catch (error) {
      rejectUpgrade(socket, error.statusCode === 403 ? 403 : 401);
    }
  };
  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (socket.isAlive === false) { socket.terminate(); continue; }
      socket.isAlive = false; socket.ping();
    }
  }, 25000);
  wss.on('connection', socket => {
    socket.isAlive = true;
    socket.on('pong', () => { socket.isAlive = true; });
  });
  server.on('upgrade', onUpgrade);
  eventBus.on('message.created', onCreated);
  return {
    close: () => {
      clearInterval(heartbeat);
      server.off('upgrade', onUpgrade);
      eventBus.off('message.created', onCreated);
      for (const socket of wss.clients) socket.terminate();
      wss.close();
    },
  };
};

module.exports = { attachMessageGateway };
