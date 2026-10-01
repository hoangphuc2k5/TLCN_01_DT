/** Database operations for equipment; dependencies are wired in config/container.js. */
class EquipmentRepository {
  constructor({ models, shared, database }) {
    this.models = models;
    this.shared = shared;
    this.database = database;
  }

  scopeEquipmentFindOne(arg1) {
    return this.models["equipment-asset"].findOne(arg1);
  }

  listEquipmentFind(arg1, arg2) {
    return this.models["equipment-asset"].find(arg1).populate('createdBy', 'name').sort(arg2).limit(500);
  }

  createEquipmentCreate(arg1) {
    return this.models["equipment-asset"].create(arg1);
  }

  updateEquipmentSave(document) {
    return document.save();
  }

  listMaintenanceFind(arg1, arg2) {
    return this.models["equipment-maintenance"].find(arg1).populate('equipmentId', 'code name location status').populate('reportedBy assignedTo', 'name').sort(arg2).limit(500);
  }

  recordCreate(arg1) {
    return this.models["equipment-maintenance"].create(arg1);
  }

  createMaintenanceSave(document) {
    return document.save();
  }

  recordFindOne(arg1) {
    return this.models["equipment-maintenance"].findOne(arg1);
  }

  updateMaintenanceSave(document) {
    return document.save();
  }

  activeExists(arg1) {
    return this.models["equipment-maintenance"].exists(arg1);
  }

  updateMaintenanceUpdateOne(arg1, arg2) {
    return this.models["equipment-asset"].updateOne(arg1, arg2);
  }
}

module.exports = EquipmentRepository;
