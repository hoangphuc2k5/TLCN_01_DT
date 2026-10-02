const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/security/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/security/audit.middleware");
const controller = require('../../controllers/teacher/attendance.controller');

const register1 = router => {
  router.get('/attendance', controller.listAttendance);
  router.post('/attendance', authorizePermissionAction(['create', 'update'], PERMISSIONS.TAKE_ATTENDANCE), audit('CREATE', 'Attendance'), controller.recordAttendance);
};

module.exports = { register1 };
