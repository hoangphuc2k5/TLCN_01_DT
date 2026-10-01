/** Database operations for notification-delivery; dependencies are wired in config/container.js. */
class NotificationDeliveryRepository {
  constructor({ models, shared, database, eventBus }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
    this.eventBus = eventBus;
  }

  notificationFindOne(arg1) {
    return this.models["notification"].findOne(arg1);
  }

  userFindById(arg1) {
    return this.models["user"].findById(arg1).select('phone');
  }

  async deliverSave(document) {
    const saved = await document.save();
    this.eventBus.emit('notification.created', saved.toObject());
    return saved;
  }
}

module.exports = NotificationDeliveryRepository;
