const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/audit.middleware");
const controller = require('../../controllers/admin/template.controller');

const register1 = router => {
  router.get('/template-deployments', authorizePermissionAction('view', PERMISSIONS.MANAGE_TEMPLATES), controller.listTemplateDeployments);
};

const register2 = router => {
  router.get('/templates', authorizeRead('templates', { personal: false }), controller.listTemplates);
  router.post('/templates', authorizePermissionAction('create', PERMISSIONS.MANAGE_TEMPLATES), audit('CREATE', 'SharedTemplate'), controller.createTemplate);
  router.put('/templates/:id', authorizePermissionAction('update', PERMISSIONS.MANAGE_TEMPLATES), controller.updateTemplate);
  router.post('/schools/:schoolId/apply-template', authorizePermissionAction('execute', PERMISSIONS.MANAGE_TEMPLATES), controller.applyTemplate);
};

module.exports = { register1, register2 };
