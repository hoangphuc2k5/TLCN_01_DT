const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/audit.middleware");
const controller = require('../../controllers/common/announcement.controller');

const register1 = router => {
  router.get('/announcements', controller.listAnnouncements);
  router.post('/announcements', authorizePermissionAction('create', PERMISSIONS.MANAGE_ANNOUNCEMENTS), audit('CREATE', 'Announcement'), controller.createAnnouncement);
  router.delete('/announcements/:id', authorizePermissionAction('delete', PERMISSIONS.MANAGE_ANNOUNCEMENTS), controller.deleteAnnouncement);
};

module.exports = { register1 };
