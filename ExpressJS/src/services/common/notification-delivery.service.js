function createNotificationDeliveryService(dependencies) {
  const persistence = dependencies.persistence;
  const ApiError = require("../../utils/common/api-error.util");
  const { objectId } = dependencies.services["data-scope"];
  
  const CHANNELS = ['SMS', 'ZALO', 'PUSH'];
  const envFor = channel => ({ SMS: ['SMS_GATEWAY_URL', 'SMS_GATEWAY_TOKEN'], ZALO: ['ZALO_GATEWAY_URL', 'ZALO_GATEWAY_TOKEN'], PUSH: ['PUSH_GATEWAY_URL', 'PUSH_GATEWAY_TOKEN'] }[channel]);
  const deliverChannel = async (channel, recipient, message) => {
    const [urlKey, tokenKey] = envFor(channel); const url = process.env[urlKey];
    if (!url) return { status: 'SKIPPED', reason: 'unconfigured' };
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env[tokenKey] ? { Authorization: `Bearer ${process.env[tokenKey]}` } : {}) }, body: JSON.stringify({ channel, recipient, message }), signal: controller.signal });
      if (!response.ok) throw new Error(`gateway_${response.status}`);
      return { status: 'SENT' };
    } catch (error) { return { status: 'FAILED', reason: error.name === 'AbortError' ? 'timeout' : 'gateway_error' }; } finally { clearTimeout(timer); }
  };
  const deliver = async (actor, id, channels = CHANNELS) => {
    const requested = Array.isArray(channels) ? channels.map(item => String(item).toUpperCase()) : [];
    if (!requested.length || requested.some(channel => !CHANNELS.includes(channel))) throw new ApiError(400, 'Kenh gui khong hop le');
    const notification = await persistence.notificationFindOne({ _id: objectId(id), userId: actor._id }); if (!notification) throw new ApiError(404, 'Khong tim thay thong bao');
    const user = await persistence.userFindById(actor._id); const results = {};
    for (const channel of requested) { // sequential to keep gateway rate limits predictable
      const recipient = channel === 'PUSH' ? String(actor._id) : user?.phone;
      results[channel] = recipient ? await deliverChannel(channel, recipient, `${notification.title}: ${notification.message}`) : { status: 'SKIPPED', reason: 'no_recipient' };
    }
    notification.delivery = { ...(notification.delivery || {}), ...Object.fromEntries(Object.entries(results).map(([channel, value]) => [channel, { ...value, at: new Date() }])) };
    await persistence.deliverSave(notification); return { notificationId: notification._id, results };
  };
  return { CHANNELS, deliver, deliverChannel };
  
}

class NotificationDeliveryService {
  constructor(dependencies) {
    Object.assign(this, createNotificationDeliveryService(dependencies));
  }
}

module.exports = NotificationDeliveryService;
