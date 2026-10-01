const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/audit.middleware");
const controller = require('../../controllers/common/calendar.controller');

const register1 = router => {
  router.get('/calendar', controller.listEvents);
  router.post('/calendar', authorizePermissionAction('create', PERMISSIONS.MANAGE_ANNOUNCEMENTS), audit('CREATE', 'CalendarEvent'), controller.createEvent);
  router.delete('/calendar/:id', authorizePermissionAction('delete', PERMISSIONS.MANAGE_ANNOUNCEMENTS), controller.deleteEvent);
};

module.exports = { register1 };
