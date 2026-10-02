const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/security/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const { ROLES } = require("../../config/constants/roles.config");
const audit = require("../../middleware/common/security/audit.middleware");
const controller = require('../../controllers/admin/timetable.controller');

const register1 = router => {
  router.get('/timetables', controller.listTimetables);
  router.post('/timetables', authorizePermissionAction(['create', 'update'], PERMISSIONS.MANAGE_TIMETABLE), audit('UPSERT', 'Timetable'), controller.upsertTimetable);
  router.patch('/timetables/:id/approve', authorizePermissionAction('execute', PERMISSIONS.MANAGE_TIMETABLE), authorizeRoles(ROLES.SCHOOL_ADMIN), controller.approveTimetable);
};

module.exports = { register1 };
