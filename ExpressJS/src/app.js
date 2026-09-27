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
const allowedOrigins = new Set(
  [process.env.FRONTEND_URL, process.env.CORS_ALLOWED_ORIGINS]
    .filter(Boolean)
    .flatMap(value => value.split(','))
    .map(value => value.trim().replace(/\/$/, ''))
    .filter(Boolean)
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.has(origin));
    },
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
