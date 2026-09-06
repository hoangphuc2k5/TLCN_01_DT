require('dotenv').config();
const mongoose = require('mongoose');
const connect = require('../src/config/database');
const { run } = require('../src/jobs/worker');
const controller = new AbortController();
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => controller.abort());
(async () => {
  require('../src/config/jobs')();
  await connect();
  await require('../src/models/Job').init();
  await require('../src/models/Notification').init();
  console.log('Job worker ready');
  await run({ signal: controller.signal });
})().catch(error => { console.error('[jobs]', error.name); process.exitCode = 1; }).finally(async () => {
  require('../src/services/mailService').closeTransporter();
  await mongoose.disconnect();
});
