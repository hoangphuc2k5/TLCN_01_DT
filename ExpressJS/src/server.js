require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connection = require('./config/database');
const apiRoutes = require('./routes/api');
const authenticate = require('./middleware/auth');
const tenantContext = require('./middleware/tenant');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const registerEventListeners = require('./patterns/registerListeners');
const { getAppName } = require('./utils/appName');

const app = express();
const port = process.env.PORT || 8080;
const appName = getAppName();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({
    EC: 0,
    EM: `${appName} API`,
    data: { version: '1.0.0', docs: '/v1/api/health', appName },
  });
});

app.use('/v1/api', authenticate, tenantContext, apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

(async () => {
  try {
    await connection();
    registerEventListeners();
    const roleCache = require('./services/rolePermissionCache');
    const { seedSystemRoles } = require('./services/roleService');
    try {
      await seedSystemRoles();
    } catch (e) {
      console.warn('seedSystemRoles warning:', e.message);
      await roleCache.reload();
    }
    app.listen(port, () => {
      console.log(`${appName} API listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
