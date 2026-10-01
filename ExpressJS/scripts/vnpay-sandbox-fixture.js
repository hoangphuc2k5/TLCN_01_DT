// Opt-in local UI fixture using sandbox credentials from ExpressJS/.env.
// Isolated MongoDB and fixture student data are still used; no real school DB is opened.
process.env.E2E_USE_VNPAY_SANDBOX = 'true';
process.env.E2E_PORT ||= '8092';
require('./e2e-fixture');
