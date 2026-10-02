
const controller = require('../../../controllers/common/platform/dashboard.controller');

const register1 = router => {
  router.get('/dashboard', controller.getDashboard);
  router.get('/notifications', controller.listNotifications);
};

const register2 = router => {
  router.patch('/notifications/read-all', controller.markAllRead);
  router.patch('/notifications/:id/read', controller.markRead);
};

module.exports = { register1, register2 };
