const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/audit.middleware");
const controller = require('../../controllers/teacher/conduct.controller');

const register1 = router => {
  router.get('/conduct', authorizeRead('conduct', { personal: true }), controller.listConduct);
  router.post('/conduct', authorizePermissionAction(['create', 'update'], PERMISSIONS.MANAGE_CONDUCT), audit('UPSERT', 'ConductRecord'), controller.upsertConduct);
};

module.exports = { register1 };
