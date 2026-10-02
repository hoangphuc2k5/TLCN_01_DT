const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/security/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const monitoringController = require("../../controllers/admin/monitoring.controller");

const register1 = router => {
  router.get('/monitoring', authorizePermissionAction('view', PERMISSIONS.VIEW_MONITORING), monitoringController.metrics);
};

module.exports = { register1 };
