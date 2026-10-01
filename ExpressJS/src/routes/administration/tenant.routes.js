const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const { ROLES } = require("../../config/constants/roles.config");
const audit = require("../../middleware/common/audit.middleware");
const controller = require('../../controllers/administration/tenant.controller');

const register1 = router => {
  router.get('/clusters', authorizePermissionAction('view', PERMISSIONS.MANAGE_CLUSTERS, PERMISSIONS.MANAGE_TENANTS), controller.listClusters);
  router.post('/clusters', authorizeRoles(ROLES.SUPER_ADMIN), audit('CREATE', 'Cluster'), controller.createCluster);
  router.put('/clusters/:id', authorizeRoles(ROLES.SUPER_ADMIN), audit('UPDATE', 'Cluster'), controller.updateCluster);
  router.delete('/clusters/:id', authorizeRoles(ROLES.SUPER_ADMIN), audit('DELETE', 'Cluster'), controller.deleteCluster);
  router.get('/schools', controller.listSchools);
  router.post('/schools', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.CLUSTER_ADMIN), audit('CREATE', 'School'), controller.createSchool);
  router.put('/schools/:id', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.CLUSTER_ADMIN, ROLES.SCHOOL_ADMIN), audit('UPDATE', 'School'), controller.updateSchool);
  router.delete('/schools/:id', authorizeRoles(ROLES.SUPER_ADMIN), audit('DELETE', 'School'), controller.deleteSchool);
};

module.exports = { register1 };
