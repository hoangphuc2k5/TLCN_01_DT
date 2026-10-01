const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/audit.middleware");
const roleController = require("../../controllers/administration/role.controller");

const register1 = router => {
  router.get('/roles/permission-catalog', authorizePermissionAction('view', PERMISSIONS.MANAGE_ROLES), roleController.permissionCatalog);
  router.get('/roles/assignable', authorizePermissionAction('view', PERMISSIONS.MANAGE_USERS, PERMISSIONS.MANAGE_ROLES), roleController.listAssignable);
  router.get('/roles', authorizePermissionAction('view', PERMISSIONS.MANAGE_ROLES), roleController.listRoles);
  router.post('/roles', authorizePermissionAction('create', PERMISSIONS.MANAGE_ROLES), audit('CREATE', 'Role'), roleController.createRole);
  router.put('/roles/:id', authorizePermissionAction('update', PERMISSIONS.MANAGE_ROLES), audit('UPDATE', 'Role'), roleController.updateRole);
  router.delete('/roles/:id', authorizePermissionAction('delete', PERMISSIONS.MANAGE_ROLES), audit('DELETE', 'Role'), roleController.deleteRole);
};

module.exports = { register1 };
