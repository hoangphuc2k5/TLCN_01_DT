const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/audit.middleware");
const classLife = require("../../controllers/common/class-life.controller");

const register1 = router => {
  router.get('/class-activities', authorizeRead('class_activities', { personal: true }), classLife.listActivities);
  router.post('/class-activities', authorizePermissionAction('create', PERMISSIONS.MANAGE_CLASS_ACTIVITIES), audit('CREATE', 'ClassActivity'), classLife.createActivity);
  router.patch('/class-activities/:id/publish', authorizePermissionAction('execute', PERMISSIONS.MANAGE_CLASS_ACTIVITIES), audit('PUBLISH', 'ClassActivity'), classLife.publishActivity);
  router.get('/parent-meetings', authorizeRead('parent_meetings', { personal: true }), classLife.listMeetings);
  router.post('/parent-meetings', authorizePermissionAction('create', PERMISSIONS.MANAGE_PARENT_MEETINGS), audit('CREATE', 'ParentMeeting'), classLife.createMeeting);
  router.patch('/parent-meetings/:id/cancel', authorizePermissionAction('execute', PERMISSIONS.MANAGE_PARENT_MEETINGS), audit('CANCEL', 'ParentMeeting'), classLife.cancelMeeting);
  router.patch('/parent-meetings/:id/rsvp', authorizeRead('parent_meetings', { personal: true }), audit('RSVP', 'ParentMeetingResponse'), classLife.rsvp);
};

module.exports = { register1 };
