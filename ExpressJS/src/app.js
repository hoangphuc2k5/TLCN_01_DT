require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const apiRoutes = require('./routes/api');
const authenticate = require('./middleware/auth');
const tenantContext = require('./middleware/tenant');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const { getAppName } = require('./utils/appName');

const app = express();

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
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

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

module.exports = app;
