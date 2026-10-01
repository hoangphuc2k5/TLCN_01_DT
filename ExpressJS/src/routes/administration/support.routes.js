const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/audit.middleware");
const controller = require('../../controllers/administration/support.controller');

const register1 = router => {
  router.get('/support-tickets', authorizePermissionAction('view', PERMISSIONS.MANAGE_SUPPORT), controller.listTickets);
  router.post('/support-tickets', authorizePermissionAction('create', PERMISSIONS.MANAGE_SUPPORT), audit('CREATE', 'SupportTicket'), controller.createTicket);
  router.patch('/support-tickets/:id', authorizePermissionAction('update', PERMISSIONS.MANAGE_SUPPORT), controller.updateTicket);
};

module.exports = { register1 };
