const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const appointments = require("../../controllers/common/appointment.controller");

const register1 = router => {
  router.get('/appointments', authorizePermissionAction('view', PERMISSIONS.MANAGE_APPOINTMENTS, PERMISSIONS.REQUEST_APPOINTMENTS), appointments.list);
  router.post('/appointments', authorizePermissionAction('create', PERMISSIONS.REQUEST_APPOINTMENTS), appointments.create);
  router.patch('/appointments/:id/review', authorizePermissionAction('update', PERMISSIONS.MANAGE_APPOINTMENTS), appointments.review);
  router.patch('/appointments/:id/cancel', authorizePermissionAction('update', PERMISSIONS.REQUEST_APPOINTMENTS, PERMISSIONS.MANAGE_APPOINTMENTS), appointments.cancel);
  router.get('/surveys', authorizePermissionAction('view', PERMISSIONS.MANAGE_APPOINTMENTS, PERMISSIONS.SUBMIT_SURVEYS), appointments.surveys);
  router.post('/appointments/:id/survey', authorizePermissionAction('create', PERMISSIONS.SUBMIT_SURVEYS), appointments.submitSurvey);
};

module.exports = { register1 };
