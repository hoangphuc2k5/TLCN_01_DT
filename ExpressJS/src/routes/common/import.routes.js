const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/audit.middleware");
const upload = require("../../middleware/common/upload.middleware");
const imp = require("../../controllers/common/import.controller");

const register1 = router => {
  router.get('/import/templates/:type', imp.downloadTemplate);
  router.post(
    '/import/users',
    authorizePermissionAction(['create', 'update'], PERMISSIONS.MANAGE_USERS),
    upload.single('file'),
    audit('IMPORT', 'User'),
    imp.importUsers
  );
  router.post(
    '/import/grades',
    authorizePermissionAction(['create', 'update'], PERMISSIONS.ENTER_GRADES),
    upload.single('file'),
    audit('IMPORT', 'Grade'),
    imp.importGrades
  );
  router.post(
    '/import/fees',
    authorizePermissionAction(['create', 'update'], PERMISSIONS.MANAGE_FEES),
    upload.single('file'),
    audit('IMPORT', 'FeeInvoice'),
    imp.importFees
  );
  router.post(
    '/import/attendance',
    authorizePermissionAction(['create', 'update'], PERMISSIONS.TAKE_ATTENDANCE),
    upload.single('file'),
    audit('IMPORT', 'Attendance'),
    imp.importAttendance
  );
};

module.exports = { register1 };
