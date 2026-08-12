const { EventEmitter } = require('events');

/**
 * Observer Pattern — central event bus for domain events
 * (attendance absence → notify parents, announcements, etc.)
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }
}

const eventBus = new EventBus();

module.exports = eventBus;
