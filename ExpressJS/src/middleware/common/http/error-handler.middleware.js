const ApiError = require("../../../utils/common/http/api-error.util");
const logger = require('../../../config/logger/logger.config');

const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Không tìm thấy route: ${req.originalUrl}`, 404));
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errorCode = err.errorCode || 1;

  if (err.name === 'ValidationError') {
    statusCode = 422;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join('; ');
    errorCode = 422;
  }

  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `Giá trị ${field} đã tồn tại`;
    errorCode = 409;
  }

  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    message = 'Internal Server Error';
    errorCode = 1;
  }

  if (process.env.NODE_ENV !== 'production') {
    logger.error('[Error]', err);
  }

  res.status(statusCode).json({
    EC: errorCode,
    EM: message,
    data: null,
  });
};

module.exports = { notFoundHandler, errorHandler };
