const test = require('node:test');
const assert = require('node:assert/strict');

const CrossRepository = require('../../repository/common/cross.repository');
const NotificationDeliveryRepository = require('../../repository/common/notification-delivery.repository');

const savedDocument = payload => ({
  async save() { return this; },
  toObject() { return payload; },
});

test('marking a message read emits the same realtime event as a message save', async () => {
  const events = [];
  const repository = new CrossRepository({
    models: {},
    eventBus: { emit: (name, payload) => events.push({ name, payload }) },
  });
  const document = savedDocument({ _id: 'message-1', read: true });

  const result = await repository.markMessageReadSave(document);

  assert.equal(result, document);
  assert.deepEqual(events, [{ name: 'message.created', payload: { _id: 'message-1', read: true } }]);
});

test('saving notification delivery emits the notification realtime event', async () => {
  const events = [];
  const repository = new NotificationDeliveryRepository({
    models: {},
    eventBus: { emit: (name, payload) => events.push({ name, payload }) },
  });
  const document = savedDocument({ _id: 'notification-1', delivery: { SMS: { status: 'SKIPPED' } } });

  const result = await repository.deliverSave(document);

  assert.equal(result, document);
  assert.deepEqual(events, [{
    name: 'notification.created',
    payload: { _id: 'notification-1', delivery: { SMS: { status: 'SKIPPED' } } },
  }]);
});
