// Opt-in local UI fixture using sandbox credentials from ExpressJS/.env.
// Isolated MongoDB and fixture student data are still used; no real school DB is opened.
process.env.PHASE0_USE_VNPAY_SANDBOX = 'true';
process.env.PHASE0_PORT ||= '8092';
require('./phase0-fixture');
