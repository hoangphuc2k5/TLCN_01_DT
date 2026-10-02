const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/security/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/security/audit.middleware");
const controller = require('../../controllers/admin/user.controller');

const register1 = router => {
  router.get('/users', authorizePermissionAction('view', PERMISSIONS.MANAGE_USERS), controller.listUsers);
  router.get('/users/directory', (req, _res, next) => {
    req.query.scope = 'directory';
    next();
  }, controller.listUsers); // danh bạ gửi tin (scope theo tenant, không lọc hierarchy)
  router.post('/users', authorizePermissionAction('create', PERMISSIONS.MANAGE_USERS), audit('CREATE', 'User'), controller.createUser);
  router.put('/users/:id', authorizePermissionAction('update', PERMISSIONS.MANAGE_USERS), audit('UPDATE', 'User'), controller.updateUser);
  router.post(
    '/users/:id/reset-password',
    authorizePermissionAction('update', PERMISSIONS.MANAGE_USERS),
    audit('RESET_PASSWORD', 'User'),
    controller.resetUserPassword
  );
  router.delete('/users/:id', authorizePermissionAction('delete', PERMISSIONS.MANAGE_USERS), audit('DELETE', 'User'), controller.deleteUser);
};

module.exports = { register1 };
