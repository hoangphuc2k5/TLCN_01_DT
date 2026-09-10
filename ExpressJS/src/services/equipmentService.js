const ApiError = require('../utils/ApiError');
const EquipmentAsset = require('../models/EquipmentAsset');
const EquipmentMaintenance = require('../models/EquipmentMaintenance');
const { ROLES } = require('../constants/roles');
const { schoolScope, objectId } = require('./dataScope');
const { targetSchool } = require('./writeScope');

const inventoryRoles = [ROLES.SUPER_ADMIN, ROLES.CLUSTER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS, ROLES.LIBRARIAN];
const scopeEquipment = async (actor, id) => EquipmentAsset.findOne({ ...await schoolScope(actor), ...(id ? { _id: objectId(id) } : {}) });
const listEquipment = async (actor, query = {}) => {
  const filter = await schoolScope(actor); if (query.status) filter.status = String(query.status).toUpperCase(); if (query.category) filter.category = String(query.category);
  return EquipmentAsset.find(filter).populate('createdBy', 'name').sort({ name: 1 }).limit(500);
};
const createEquipment = async (actor, data = {}) => {
  if (!inventoryRoles.includes(actor.role)) throw new ApiError(403, 'Khong co quyen quan ly thiet bi');
  if (!data.code || !data.name) throw new ApiError(400, 'Thieu code/name');
  const schoolId = await targetSchool(actor, data.schoolId); const quantity = Number(data.quantity || 1);
  if (!Number.isInteger(quantity) || quantity < 1) throw new ApiError(400, 'quantity khong hop le');
  return EquipmentAsset.create({ schoolId, code: String(data.code).trim().toUpperCase(), name: String(data.name).trim(), category: data.category || 'GENERAL', serialNumber: data.serialNumber || '', location: data.location || '', quantity, purchaseDate: data.purchaseDate || null, warrantyUntil: data.warrantyUntil || null, status: data.status || 'AVAILABLE', note: data.note || '', createdBy: actor._id });
};
const updateEquipment = async (actor, id, data = {}) => {
  if (!inventoryRoles.includes(actor.role)) throw new ApiError(403, 'Khong co quyen quan ly thiet bi');
  const row = await scopeEquipment(actor, id); if (!row) throw new ApiError(404, 'Khong tim thay thiet bi');
  for (const key of ['name', 'category', 'serialNumber', 'location', 'purchaseDate', 'warrantyUntil', 'note']) if (data[key] !== undefined) row[key] = data[key];
  if (data.quantity !== undefined) { const quantity = Number(data.quantity); if (!Number.isInteger(quantity) || quantity < 1) throw new ApiError(400, 'quantity khong hop le'); row.quantity = quantity; }
  if (data.status !== undefined) { const status = String(data.status).toUpperCase(); if (!['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED'].includes(status)) throw new ApiError(400, 'status khong hop le'); row.status = status; }
  await row.save(); return row;
};
const listMaintenance = async (actor, query = {}) => {
  const filter = await schoolScope(actor); if (query.status) filter.status = String(query.status).toUpperCase(); if (query.priority) filter.priority = String(query.priority).toUpperCase();
  return EquipmentMaintenance.find(filter).populate('equipmentId', 'code name location status').populate('reportedBy assignedTo', 'name').sort({ createdAt: -1 }).limit(500);
};
const createMaintenance = async (actor, data = {}) => {
  if (!data.equipmentId || !String(data.issue || '').trim()) throw new ApiError(400, 'Thieu equipmentId/issue');
  const equipment = await scopeEquipment(actor, data.equipmentId); if (!equipment) throw new ApiError(404, 'Khong tim thay thiet bi');
  const priority = String(data.priority || 'MEDIUM').toUpperCase(); if (!['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) throw new ApiError(400, 'priority khong hop le');
  const record = await EquipmentMaintenance.create({ schoolId: equipment.schoolId, equipmentId: equipment._id, reportedBy: actor._id, issue: String(data.issue).trim(), description: data.description || '', priority, cost: Number(data.cost || 0) });
  if (equipment.status !== 'RETIRED') { equipment.status = 'MAINTENANCE'; await equipment.save(); }
  return record;
};
const updateMaintenance = async (actor, id, data = {}) => {
  if (!inventoryRoles.includes(actor.role)) throw new ApiError(403, 'Khong co quyen cap nhat bao tri');
  const record = await EquipmentMaintenance.findOne({ ...await schoolScope(actor), _id: objectId(id) }); if (!record) throw new ApiError(404, 'Khong tim thay phieu bao tri');
  const next = String(data.status || '').toUpperCase(); if (!['IN_PROGRESS', 'RESOLVED', 'CANCELLED'].includes(next)) throw new ApiError(400, 'status khong hop le');
  if (next === 'IN_PROGRESS' && record.status !== 'OPEN') throw new ApiError(409, 'Trang thai khong cho phep');
  if (['RESOLVED', 'CANCELLED'].includes(next) && !['OPEN', 'IN_PROGRESS'].includes(record.status)) throw new ApiError(409, 'Trang thai khong cho phep');
  record.status = next; record.resolution = data.resolution || ''; if (data.cost !== undefined) { const cost = Number(data.cost); if (!Number.isFinite(cost) || cost < 0) throw new ApiError(400, 'cost khong hop le'); record.cost = cost; } if (next === 'RESOLVED') record.resolvedAt = new Date(); await record.save();
  const active = await EquipmentMaintenance.exists({ equipmentId: record.equipmentId, status: { $in: ['OPEN', 'IN_PROGRESS'] } });
  await EquipmentAsset.updateOne({ _id: record.equipmentId }, { status: active ? 'MAINTENANCE' : 'AVAILABLE' });
  return record;
};
module.exports = { listEquipment, createEquipment, updateEquipment, listMaintenance, createMaintenance, updateMaintenance };
