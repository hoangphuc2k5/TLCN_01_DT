const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../../middleware/common/security/rbac.middleware");
const { PERMISSIONS } = require("../../../config/constants/permissions.config");
const platformController = require("../../../controllers/common/platform/platform.controller");

const register1 = router => {
  router.get('/reports/schools/compare', authorizePermissionAction('view', PERMISSIONS.VIEW_REPORTS), platformController.compareSchools);
  router.get('/reports/schools/compare/export.xlsx', authorizePermissionAction('view', PERMISSIONS.VIEW_REPORTS), platformController.exportSchoolsExcel);
  router.get('/reports/schools/compare/export.pdf', authorizePermissionAction('view', PERMISSIONS.VIEW_REPORTS), platformController.exportSchoolsPdf);
};

module.exports = { register1 };
