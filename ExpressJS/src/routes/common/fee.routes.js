const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/audit.middleware");
const controller = require('../../controllers/common/fee.controller');

const register1 = router => {
  router.get('/fees', controller.listInvoices);
  router.post('/fees', authorizePermissionAction('create', PERMISSIONS.MANAGE_FEES), audit('CREATE', 'FeeInvoice'), controller.createInvoice);
  router.get('/payments', authorizePermissionAction('view', PERMISSIONS.MANAGE_FEES), controller.listPayments);
  router.post('/payments', authorizePermissionAction('create', PERMISSIONS.MANAGE_FEES), audit('CREATE', 'Payment'), controller.recordPayment);
};

module.exports = { register1 };
