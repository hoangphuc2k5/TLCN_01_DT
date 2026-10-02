const app = require('../src/app');
const ensureRuntimeStarted = require('../src/config/runtime/startup.config');
const logger = require('../src/config/logger/logger.config');

module.exports = async function handler(req, res) {
  try {
    await ensureRuntimeStarted();
    return app(req, res);
  } catch (error) {
    logger.error('Vercel function initialization failed:', error);
    if (!res.headersSent) {
      return res.status(503).json({
        EC: 1,
        EM: 'Dịch vụ tạm thời chưa sẵn sàng',
        data: null,
      });
    }
    return res.end();
  }
};

