require('dotenv').config();
const connect = require("../src/config/database/database.config");
const container = require('../src/config/container');
const logger = require('../src/config/logger/logger.config');
const { run } = container.services['job-worker'];
const controller = new AbortController();
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => controller.abort());
(async () => {
  require("../src/config/jobs/jobs.config")();
  await connect();
  await container.repositories.system.initializeModels(['job', 'notification']);
  logger.log('Job worker ready');
  await run({ signal: controller.signal });
})().catch(error => { logger.error('[jobs]', error.name); process.exitCode = 1; }).finally(async () => {
  container.services.mail.closeTransporter();
  await connect.disconnect();
});
