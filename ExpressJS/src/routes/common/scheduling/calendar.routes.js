const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../../middleware/common/security/rbac.middleware");
const { PERMISSIONS } = require("../../../config/constants/permissions.config");
const audit = require("../../../middleware/common/security/audit.middleware");
const controller = require('../../../controllers/common/scheduling/calendar.controller');

const register1 = router => {
  router.get('/calendar', controller.listEvents);
  router.post('/calendar', authorizePermissionAction('create', PERMISSIONS.MANAGE_ANNOUNCEMENTS), audit('CREATE', 'CalendarEvent'), controller.createEvent);
  router.delete('/calendar/:id', authorizePermissionAction('delete', PERMISSIONS.MANAGE_ANNOUNCEMENTS), controller.deleteEvent);
};

module.exports = { register1 };
