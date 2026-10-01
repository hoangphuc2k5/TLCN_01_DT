const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/audit.middleware");
const jobs = require("../../controllers/administration/job.controller");

const register1 = router => {
  router.get('/jobs', authorizeRead('jobs'), jobs.list);
  router.post('/jobs/:id/retry', authorizePermissionAction('execute', PERMISSIONS.MANAGE_JOBS), audit('RETRY', 'Job'), jobs.retry);
  router.post('/jobs/:id/cancel', authorizePermissionAction('execute', PERMISSIONS.MANAGE_JOBS), audit('CANCEL', 'Job'), jobs.cancel);
};

module.exports = { register1 };
