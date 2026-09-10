require('dotenv').config();
const app = require('./app');
const http = require('node:http');
const { attachMessageGateway } = require('./realtime/messageGateway');
const connection = require('./config/database');
const registerEventListeners = require('./patterns/registerListeners');
const { getAppName } = require('./utils/appName');
const port = process.env.PORT || 8080;
const appName = getAppName();

(async () => {
  try {
    await connection();
    await require('./models/FileAsset').init();
    await require('./models/Job').init();
    await require('./models/AuthAttempt').init();
    registerEventListeners();
    const roleCache = require('./services/rolePermissionCache');
    const { seedSystemRoles } = require('./services/roleService');
    try {
      await seedSystemRoles();
    } catch (e) {
      console.warn('seedSystemRoles warning:', e.message);
      await roleCache.reload();
    }
    const server = http.createServer(app);
    attachMessageGateway(server);
    server.listen(port, () => {
      console.log(`${appName} API listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
