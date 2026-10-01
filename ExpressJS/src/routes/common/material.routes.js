const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/audit.middleware");
const controller = require('../../controllers/common/material.controller');

const register1 = router => {
  router.get('/materials', authorizeRead('materials', { personal: true }), controller.listMaterials);
  router.post('/materials', authorizePermissionAction('create', PERMISSIONS.MANAGE_MATERIALS), audit('CREATE', 'LearningMaterial'), controller.createMaterial);
  router.delete('/materials/:id', authorizePermissionAction('delete', PERMISSIONS.MANAGE_MATERIALS), controller.deleteMaterial);
};

module.exports = { register1 };
