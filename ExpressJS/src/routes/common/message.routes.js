const audit = require("../../middleware/common/audit.middleware");
const controller = require('../../controllers/common/message.controller');

const register1 = router => {
  router.get('/messages', controller.listMessages);
  router.post('/messages', audit('CREATE', 'Message'), controller.sendMessage);
  router.patch('/messages/:id/read', controller.markMessageRead);
  router.post('/messages/realtime-ticket', controller.realtimeTicket);
};

module.exports = { register1 };
