const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/audit.middleware");
const controller = require('../../controllers/administration/audit.controller');

const register1 = router => {
  router.get('/audit-logs', authorizePermissionAction('view', PERMISSIONS.VIEW_AUDIT), controller.listAuditLogs);
};

module.exports = { register1 };
