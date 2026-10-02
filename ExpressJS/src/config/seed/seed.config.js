require('dotenv').config();
const connection = require('../database/database.config');
const container = require('../container');
const logger = require('../logger/logger.config');

(async () => {
  try {
    await connection();
    await container.services.seed.run();
  } catch (error) {
    logger.error(error);
    process.exitCode = 1;
  } finally {
    await connection.disconnect();
  }
})();
