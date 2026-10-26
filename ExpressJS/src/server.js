require('dotenv').config();
const app = require('./app');
const http = require('node:http');
const { attachMessageGateway } = require('./config/realtime/realtime.config');
const logger = require("./config/logger/logger.config");
const ensureRuntimeStarted = require('./config/runtime/startup.config');
const mongoose = require('mongoose');
const { getAppName } = require("./utils/common/platform/app-name.util");
const port = process.env.PORT || 8080;
const appName = getAppName();

(async () => {
  try {
    await ensureRuntimeStarted();
    const server = http.createServer(app);
    attachMessageGateway(server);
    server.listen(port, () => {
      logger.log(`${appName} API listening on port ${port}`);
    });

    const shutdown = async (signal) => {
      logger.log(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        try {
          await mongoose.disconnect();
          logger.log('Closed HTTP server and MongoDB connections.');
          process.exit(0);
        } catch (err) {
          logger.error('Error during disconnect:', err);
          process.exit(1);
        }
      });
      setTimeout(() => {
        logger.error('Forcefully terminating process after shutdown timeout.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
})();
