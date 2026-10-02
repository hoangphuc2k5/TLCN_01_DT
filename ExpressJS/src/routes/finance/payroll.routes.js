const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/security/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/security/audit.middleware");
const payroll = require("../../controllers/finance/payroll.controller");

const register1 = router => {
  router.get('/fees/debtors', authorizePermissionAction('view', PERMISSIONS.MANAGE_FEES), payroll.debtors);
  router.post('/fees/reminders/run', authorizePermissionAction('execute', PERMISSIONS.MANAGE_FEES), audit('RUN_REMINDERS', 'FeeInvoice'), payroll.reminders);
  router.get('/payroll', authorizePermissionAction('view', PERMISSIONS.MANAGE_FEES), payroll.list);
  router.post('/payroll', authorizePermissionAction('create', PERMISSIONS.MANAGE_FEES), audit('CREATE', 'PayrollRecord'), payroll.create);
  router.patch('/payroll/:id/status', authorizePermissionAction('execute', PERMISSIONS.MANAGE_FEES), audit('UPDATE_STATUS', 'PayrollRecord'), payroll.status);
};

module.exports = { register1 };
