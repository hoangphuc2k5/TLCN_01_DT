const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const monitoringController = require("../../controllers/administration/monitoring.controller");

const register1 = router => {
  router.get('/monitoring', authorizePermissionAction('view', PERMISSIONS.VIEW_MONITORING), monitoringController.metrics);
};

module.exports = { register1 };
