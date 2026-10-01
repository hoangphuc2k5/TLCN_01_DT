class SystemRepository {
  constructor({ models, eventBus }) { this.models = models; this.eventBus = eventBus; }
  findAuthUser(id) { return this.models.user.findById(id).select('+security'); }
  createAudit(data) { return this.models['audit-log'].create(data); }
  findSchoolBySubdomain(subdomain) { return this.models.school.findOne({ subdomain }).select('_id clusterId status subdomain'); }
  findNotification(filter) { return this.models.notification.findOne(filter); }
  findUserById(id, select) {
    const query = this.models.user.findById(id);
    return select ? query.select(select) : query;
  }
  findRole(filter) { return this.models.role.findOne(filter); }
  schoolExists(filter) { return this.models.school.exists(filter); }
  findFileAsset(filter) { return this.models['file-asset'].findOne(filter); }
  findUsers(filter) { return this.models.user.find(filter); }
  async createNotification(data) {
    const document = await this.models.notification.create(data);
    this.eventBus.emit('notification.created', document.toObject());
    return document;
  }
  async insertNotifications(data) {
    const documents = await this.models.notification.insertMany(data);
    for (const document of documents) {
      this.eventBus.emit('notification.created', document.toObject ? document.toObject() : document);
    }
    return documents;
  }
  async initializeModels(names) {
    for (const name of names) await this.models[name].init();
  }
}

module.exports = SystemRepository;
