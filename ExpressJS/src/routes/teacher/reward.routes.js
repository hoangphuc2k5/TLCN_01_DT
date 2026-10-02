const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/security/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/security/audit.middleware");
const rewards = require("../../controllers/teacher/reward.controller");

const register1 = router => {
  router.get('/rewards', authorizeRead('rewards', { personal: true }), rewards.list);
  router.post('/rewards', authorizePermissionAction(['create', 'update'], PERMISSIONS.MANAGE_REWARDS), audit('CREATE', 'RewardDisciplineRecord'), rewards.create);
  router.patch('/rewards/:id/review', authorizePermissionAction('execute', PERMISSIONS.MANAGE_REWARDS), rewards.review);
};

module.exports = { register1 };
