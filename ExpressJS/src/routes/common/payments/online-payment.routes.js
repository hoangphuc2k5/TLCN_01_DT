const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../../middleware/common/security/rbac.middleware");
const { PERMISSIONS } = require("../../../config/constants/permissions.config");
const onlinePayments = require("../../../controllers/common/payments/online-payment.controller");

const register1 = router => {
  router.get('/online-payments/vnpay/ipn', onlinePayments.vnpayIpn);
  router.get('/online-payments/vnpay/return', onlinePayments.vnpayReturn);
  router.post('/online-payments/webhook/:provider', onlinePayments.webhook);
  router.post('/online-payments', authorizePermissionAction('create', PERMISSIONS.PAY_ONLINE), onlinePayments.create);
  router.get('/online-payments', authorizePermissionAction('view', PERMISSIONS.PAY_ONLINE, PERMISSIONS.MANAGE_FEES), onlinePayments.list);
  router.get('/online-payments/:id', authorizePermissionAction('view', PERMISSIONS.PAY_ONLINE, PERMISSIONS.MANAGE_FEES), onlinePayments.get);
};

module.exports = { register1 };
