const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const { ROLES } = require("../../config/constants/roles.config");
const audit = require("../../middleware/common/audit.middleware");
const controller = require('../../controllers/common/facility.controller');

const register1 = router => {
  router.get('/facilities', authorizeRead('facilities', { personal: false }), controller.listFacilities);
  router.post('/facilities', authorizePermissionAction('create', PERMISSIONS.MANAGE_FACILITIES), audit('CREATE', 'FacilityRequest'), controller.createFacility);
  router.patch('/facilities/:id/review', authorizePermissionAction('execute', PERMISSIONS.MANAGE_FACILITIES), authorizeRoles(ROLES.LIBRARIAN, ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS), audit('REVIEW', 'FacilityRequest'), controller.reviewFacility);
};

module.exports = { register1 };
