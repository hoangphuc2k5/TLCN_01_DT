const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/security/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const admissions = require("../../controllers/admin/admission.controller");

const register1 = router => {
  router.post('/admissions/public', admissions.createPublic);
  router.get('/admissions/public/:code', admissions.getPublic);
  router.get('/admissions', authorizePermissionAction('view', PERMISSIONS.MANAGE_ADMISSIONS), admissions.list);
  router.patch('/admissions/:id/review', authorizePermissionAction('execute', PERMISSIONS.MANAGE_ADMISSIONS), admissions.review);
};

module.exports = { register1 };
