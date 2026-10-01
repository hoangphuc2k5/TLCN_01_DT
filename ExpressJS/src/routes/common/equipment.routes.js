const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/audit.middleware");
const equipment = require("../../controllers/common/equipment.controller");

const register1 = router => {
  router.get('/equipment', authorizeRead('facilities', { personal: true }), equipment.list);
  router.post('/equipment', authorizePermissionAction('create', PERMISSIONS.MANAGE_FACILITIES), audit('CREATE', 'EquipmentAsset'), equipment.create);
  router.put('/equipment/:id', authorizePermissionAction('update', PERMISSIONS.MANAGE_FACILITIES), audit('UPDATE', 'EquipmentAsset'), equipment.update);
  router.get('/equipment-maintenance', authorizeRead('facilities', { personal: true }), equipment.listMaintenance);
  router.post('/equipment-maintenance', authorizePermissionAction('create', PERMISSIONS.MANAGE_FACILITIES), audit('CREATE', 'EquipmentMaintenance'), equipment.createMaintenance);
  router.patch('/equipment-maintenance/:id', authorizePermissionAction('execute', PERMISSIONS.MANAGE_FACILITIES), audit('UPDATE', 'EquipmentMaintenance'), equipment.updateMaintenance);
};

module.exports = { register1 };
