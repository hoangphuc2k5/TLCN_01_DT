const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/audit.middleware");
const controller = require('../../controllers/common/grade.controller');

const register1 = router => {
  router.get('/grades', controller.listGrades);
  router.post('/grades', authorizePermissionAction(['create', 'update'], PERMISSIONS.ENTER_GRADES), audit('UPSERT', 'Grade'), controller.upsertGrade);
  router.post('/grades/:id/scores', authorizePermissionAction('update', PERMISSIONS.ENTER_GRADES), controller.addScore);
};

module.exports = { register1 };
