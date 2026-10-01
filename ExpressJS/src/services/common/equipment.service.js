function createEquipmentService(dependencies) {
  const persistence = dependencies.persistence;
  const ApiError = require("../../utils/common/api-error.util");
  const { ROLES } = require("../../config/constants/roles.config");
  const { schoolScope, objectId } = dependencies.services["data-scope"];
  const { targetSchool } = dependencies.services["write-scope"];
  
  const inventoryRoles = [ROLES.SUPER_ADMIN, ROLES.CLUSTER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS, ROLES.LIBRARIAN];
  const scopeEquipment = async (actor, id) => persistence.scopeEquipmentFindOne({ ...await schoolScope(actor), ...(id ? { _id: objectId(id) } : {}) });
  const listEquipment = async (actor, query = {}) => {
    const filter = await schoolScope(actor); if (query.status) filter.status = String(query.status).toUpperCase(); if (query.category) filter.category = String(query.category);
    return persistence.listEquipmentFind(filter, { name: 1 });
  };
  const createEquipment = async (actor, data = {}) => {
    if (!inventoryRoles.includes(actor.role)) throw new ApiError(403, 'Khong co quyen quan ly thiet bi');
    if (!data.code || !data.name) throw new ApiError(400, 'Thieu code/name');
    const schoolId = await targetSchool(actor, data.schoolId); const quantity = Number(data.quantity || 1);
    if (!Number.isInteger(quantity) || quantity < 1) throw new ApiError(400, 'quantity khong hop le');
    return persistence.createEquipmentCreate({ schoolId, code: String(data.code).trim().toUpperCase(), name: String(data.name).trim(), category: data.category || 'GENERAL', serialNumber: data.serialNumber || '', location: data.location || '', quantity, purchaseDate: data.purchaseDate || null, warrantyUntil: data.warrantyUntil || null, status: data.status || 'AVAILABLE', note: data.note || '', createdBy: actor._id });
  };
  const updateEquipment = async (actor, id, data = {}) => {
    if (!inventoryRoles.includes(actor.role)) throw new ApiError(403, 'Khong co quyen quan ly thiet bi');
    const row = await scopeEquipment(actor, id); if (!row) throw new ApiError(404, 'Khong tim thay thiet bi');
    for (const key of ['name', 'category', 'serialNumber', 'location', 'purchaseDate', 'warrantyUntil', 'note']) if (data[key] !== undefined) row[key] = data[key];
    if (data.quantity !== undefined) { const quantity = Number(data.quantity); if (!Number.isInteger(quantity) || quantity < 1) throw new ApiError(400, 'quantity khong hop le'); row.quantity = quantity; }
    if (data.status !== undefined) { const status = String(data.status).toUpperCase(); if (!['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED'].includes(status)) throw new ApiError(400, 'status khong hop le'); row.status = status; }
    await persistence.updateEquipmentSave(row); return row;
  };
  const listMaintenance = async (actor, query = {}) => {
    const filter = await schoolScope(actor); if (query.status) filter.status = String(query.status).toUpperCase(); if (query.priority) filter.priority = String(query.priority).toUpperCase();
    return persistence.listMaintenanceFind(filter, { createdAt: -1 });
  };
  const createMaintenance = async (actor, data = {}) => {
    if (!data.equipmentId || !String(data.issue || '').trim()) throw new ApiError(400, 'Thieu equipmentId/issue');
    const equipment = await scopeEquipment(actor, data.equipmentId); if (!equipment) throw new ApiError(404, 'Khong tim thay thiet bi');
    const priority = String(data.priority || 'MEDIUM').toUpperCase(); if (!['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) throw new ApiError(400, 'priority khong hop le');
    const record = await persistence.recordCreate({ schoolId: equipment.schoolId, equipmentId: equipment._id, reportedBy: actor._id, issue: String(data.issue).trim(), description: data.description || '', priority, cost: Number(data.cost || 0) });
    if (equipment.status !== 'RETIRED') { equipment.status = 'MAINTENANCE'; await persistence.createMaintenanceSave(equipment); }
    return record;
  };
  const updateMaintenance = async (actor, id, data = {}) => {
    if (!inventoryRoles.includes(actor.role)) throw new ApiError(403, 'Khong co quyen cap nhat bao tri');
    const record = await persistence.recordFindOne({ ...await schoolScope(actor), _id: objectId(id) }); if (!record) throw new ApiError(404, 'Khong tim thay phieu bao tri');
    const next = String(data.status || '').toUpperCase(); if (!['IN_PROGRESS', 'RESOLVED', 'CANCELLED'].includes(next)) throw new ApiError(400, 'status khong hop le');
    if (next === 'IN_PROGRESS' && record.status !== 'OPEN') throw new ApiError(409, 'Trang thai khong cho phep');
    if (['RESOLVED', 'CANCELLED'].includes(next) && !['OPEN', 'IN_PROGRESS'].includes(record.status)) throw new ApiError(409, 'Trang thai khong cho phep');
    record.status = next; record.resolution = data.resolution || ''; if (data.cost !== undefined) { const cost = Number(data.cost); if (!Number.isFinite(cost) || cost < 0) throw new ApiError(400, 'cost khong hop le'); record.cost = cost; } if (next === 'RESOLVED') record.resolvedAt = new Date(); await persistence.updateMaintenanceSave(record);
    const active = await persistence.activeExists({ equipmentId: record.equipmentId, status: { $in: ['OPEN', 'IN_PROGRESS'] } });
    await persistence.updateMaintenanceUpdateOne({ _id: record.equipmentId }, { status: active ? 'MAINTENANCE' : 'AVAILABLE' });
    return record;
  };
  return { listEquipment, createEquipment, updateEquipment, listMaintenance, createMaintenance, updateMaintenance };
  
}

class EquipmentService {
  constructor(dependencies) {
    Object.assign(this, createEquipmentService(dependencies));
  }
}

module.exports = EquipmentService;
