require('dotenv').config();
const app = require('./app');
const http = require('node:http');
const { attachMessageGateway } = require('./config/realtime/realtime.config');
const logger = require("./config/logger/logger.config");
const ensureRuntimeStarted = require('./config/runtime/startup.config');
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
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
})();
