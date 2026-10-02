require('dotenv').config();
const app = require('./app');
const http = require('node:http');
const { attachMessageGateway } = require('./config/realtime/realtime.config');
const connection = require("./config/database/database.config");
const container = require("./config/container");
const logger = require("./config/logger/logger.config");
const registerEventListeners = require("./config/events/register-listeners.config");
const { getAppName } = require("./utils/common/app-name.util");
const port = process.env.PORT || 8080;
const appName = getAppName();

(async () => {
  try {
    await connection();
    await container.repositories.system.initializeModels(['file-asset', 'job', 'auth-attempt']);
    registerEventListeners();
    const roleCache = container.services["role-permission-cache"];
    const { seedSystemRoles } = container.services["role"];
    try {
      await seedSystemRoles();
    } catch (e) {
      logger.warn('seedSystemRoles warning:', e.message);
      await roleCache.reload();
    }
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
