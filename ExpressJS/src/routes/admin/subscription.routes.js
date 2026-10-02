const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/audit.middleware");
const controller = require('../../controllers/admin/subscription.controller');

const register1 = router => {
  router.get('/subscriptions', authorizePermissionAction('view', PERMISSIONS.MANAGE_SUBSCRIPTIONS, PERMISSIONS.VIEW_REPORTS), controller.listSubscriptions);
  router.post('/subscriptions', authorizePermissionAction(['create', 'update'], PERMISSIONS.MANAGE_SUBSCRIPTIONS), audit('UPSERT', 'Subscription'), controller.upsertSubscription);
  router.get('/subscription-invoices', authorizePermissionAction('view', PERMISSIONS.MANAGE_SUBSCRIPTIONS), controller.listSubInvoices);
  router.post('/subscription-invoices', authorizePermissionAction('create', PERMISSIONS.MANAGE_SUBSCRIPTIONS), audit('CREATE', 'SubscriptionInvoice'), controller.createSubInvoice);
  router.patch('/subscription-invoices/:id/paid', authorizePermissionAction('execute', PERMISSIONS.MANAGE_SUBSCRIPTIONS), controller.markSubInvoicePaid);
};

module.exports = { register1 };
