import axios from '../../config/http-client';
import { apiOrigin } from './request-utils.js';

export const getNotificationsApi = () => axios.get('/v1/api/notifications');

export const markNotificationReadApi = (id) =>
  axios.patch(`/v1/api/notifications/${id}/read`);

export const deliverNotificationApi = (id, channels = ['SMS', 'ZALO', 'PUSH']) => axios.post(`/v1/api/notifications/${id}/deliver`, { channels });

export const openNotificationStream = async onMessage => {
  const response = await fetch(`${apiOrigin()}/v1/api/notifications/stream`, { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, Accept: 'text/event-stream' } });
  if (!response.ok || !response.body) throw new Error('Notification stream unavailable');
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
  while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const events = buffer.split('\n\n'); buffer = events.pop() || ''; for (const event of events) { const line = event.split('\n').find(item => item.startsWith('data:')); if (line) { try { onMessage(JSON.parse(line.slice(5).trim())); } catch { /* ignore malformed event */ } } } }
  return true;
};

export const getAnnouncementsApi = () => axios.get('/v1/api/announcements');

export const createAnnouncementApi = (data) => axios.post('/v1/api/announcements', data);

export const deleteAnnouncementApi = (id) => axios.delete(`/v1/api/announcements/${id}`);

export const getMessagesApi = (params) => axios.get('/v1/api/messages', { params });

export const sendMessageApi = (data) => axios.post('/v1/api/messages', data);

export const markMessageReadApi = (id) => axios.patch(`/v1/api/messages/${id}/read`);

export const getMessageRealtimeTicketApi = () => axios.post('/v1/api/messages/realtime-ticket');

export const openMessageRealtime = ({ getCursor, onEvent, onStatus }) => {
  let socket; let retryTimer; let stopped = false; let retryMs = 1000;
  const connect = async () => {
    if (stopped) return;
    onStatus?.('CONNECTING');
    try {
      const response = await getMessageRealtimeTicketApi();
      if (response?.EC !== 0 || !response.data?.ticket) throw new Error(response?.EM || 'Không lấy được ticket realtime');
      const base = apiOrigin() || window.location.origin;
      const url = new URL(response.data.path, base);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.searchParams.set('ticket', response.data.ticket);
      const cursor = getCursor?.(); if (cursor) url.searchParams.set('cursor', cursor);
      socket = new WebSocket(url);
      socket.onopen = () => { retryMs = 1000; onStatus?.('CONNECTED'); };
      socket.onmessage = event => { try { onEvent?.(JSON.parse(event.data)); } catch { /* ignore malformed events */ } };
      socket.onerror = () => socket?.close();
      socket.onclose = () => {
        if (stopped) return;
        onStatus?.('RECONNECTING');
        retryTimer = window.setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, 15000);
      };
    } catch {
      if (stopped) return;
      onStatus?.('RECONNECTING');
      retryTimer = window.setTimeout(connect, retryMs);
      retryMs = Math.min(retryMs * 2, 15000);
    }
  };
  connect();
  return () => { stopped = true; window.clearTimeout(retryTimer); socket?.close(); onStatus?.('DISCONNECTED'); };
};
