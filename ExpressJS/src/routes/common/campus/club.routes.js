const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../../middleware/common/security/rbac.middleware");
const { PERMISSIONS } = require("../../../config/constants/permissions.config");
const audit = require("../../../middleware/common/security/audit.middleware");
const clubs = require("../../../controllers/common/campus/club.controller");

const register1 = router => {
  router.get('/clubs', authorizeRead('clubs', { personal: true }), clubs.listClubs);
  router.post('/clubs', authorizePermissionAction('create', PERMISSIONS.MANAGE_CLUBS), audit('CREATE', 'Club'), clubs.createClub);
  router.post('/clubs/:id/register', authorizePermissionAction('create', PERMISSIONS.REGISTER_CLUBS), audit('REGISTER', 'ClubRegistration'), clubs.register);
  router.patch('/club-registrations/:id/cancel', authorizePermissionAction('update', PERMISSIONS.REGISTER_CLUBS), audit('CANCEL', 'ClubRegistration'), clubs.cancel);
  router.get('/club-registrations', authorizeRead('clubs', { personal: true }), clubs.registrations);
  router.get('/retake-requests', authorizeRead('retakes', { personal: true }), clubs.retakes);
  router.post('/retake-requests', authorizePermissionAction('create', PERMISSIONS.REQUEST_RETAKES), audit('CREATE', 'RetakeRequest'), clubs.createRetake);
  router.patch('/retake-requests/:id/review', authorizePermissionAction('execute', PERMISSIONS.MANAGE_RETAKES), audit('REVIEW', 'RetakeRequest'), clubs.reviewRetake);
};

module.exports = { register1 };
