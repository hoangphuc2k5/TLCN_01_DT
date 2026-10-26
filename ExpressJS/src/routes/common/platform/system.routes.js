const mongoose = require('mongoose');

const register1 = router => {
  router.get('/health', (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    res.status(isDbConnected ? 200 : 503).json({
      EC: isDbConnected ? 0 : 503,
      EM: isDbConnected ? 'OK' : 'Database disconnected',
      data: {
        status: isDbConnected ? 'up' : 'down',
        database: isDbConnected ? 'connected' : 'disconnected',
        uptime: process.uptime(),
      },
    });
  });
};

module.exports = { register1 };
