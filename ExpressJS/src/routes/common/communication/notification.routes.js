const notificationController = require("../../../controllers/common/communication/notification.controller");

const register1 = router => {
  router.get('/notifications/stream', notificationController.stream);
  router.post('/notifications/:id/deliver', notificationController.deliver);
};

module.exports = { register1 };
