const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../../middleware/common/security/rbac.middleware");
const { PERMISSIONS } = require("../../../config/constants/permissions.config");
const { ROLES } = require("../../../config/constants/roles.config");
const audit = require("../../../middleware/common/security/audit.middleware");
const controller = require('../../../controllers/common/scheduling/leave.controller');

const register1 = router => {
  router.get('/leave-requests', controller.listLeaves);
  router.post('/leave-requests', authorizePermissionAction('create', PERMISSIONS.MANAGE_LEAVE), controller.createLeave);
  router.patch('/leave-requests/:id/review', authorizePermissionAction('execute', PERMISSIONS.MANAGE_LEAVE), authorizeRoles(ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS, ROLES.HOMEROOM_TEACHER, ROLES.CLUSTER_ADMIN), audit('REVIEW', 'LeaveRequest'), controller.reviewLeave);
  router.patch('/leave-requests/:id/cancel-makeup', authorizePermissionAction('execute', PERMISSIONS.MANAGE_LEAVE), audit('CANCEL_MAKEUP', 'LeaveRequest'), controller.cancelMakeup);
};

module.exports = { register1 };
