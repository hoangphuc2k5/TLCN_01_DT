const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const delivery = require('../services/notificationDeliveryService');
const eventBus = require('../patterns/eventBus');

exports.deliver = asyncHandler(async (req, res) => success(res, await delivery.deliver(req.user, req.params.id, req.body?.channels), 'Notification delivery requested'));
exports.stream = (req, res) => {
  res.status(200).set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders?.(); res.write('retry: 5000\n\n');
  const onNotification = notification => { if (String(notification.userId) === String(req.user._id)) res.write(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`); };
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25000);
  eventBus.on('notification.created', onNotification);
  const cleanup = () => { clearInterval(heartbeat); eventBus.off('notification.created', onNotification); };
  req.on('close', cleanup); res.on('close', cleanup);
};
