const { authorizePermissionAction } = require('../../middleware/common/security/rbac.middleware');
const { PERMISSIONS } = require('../../config/constants/permissions.config');
const audit = require('../../middleware/common/security/audit.middleware');
const controller = require('../../controllers/admin/school-transfer.controller');
const register1 = router => {
  const permission = action => authorizePermissionAction(action, PERMISSIONS.MANAGE_USERS);
  router.get('/school-transfers/schools', permission('view'), controller.schools);
  router.get('/school-transfers', permission('view'), controller.list);
  router.get('/school-transfers/:id', permission('view'), controller.detail);
  router.post('/school-transfers', permission('create'), audit('CREATE', 'SchoolTransfer'), controller.create);
  router.post('/school-transfers/:id/decision', permission('update'), audit('UPDATE', 'SchoolTransfer'), controller.decide);
};
module.exports = { register1 };
