const ApiError = require('../utils/ApiError');

const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Không tìm thấy route: ${req.originalUrl}`, 404));
};

const errorHandler = (err, req, res, next) => {
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

  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error]', err);
  }

  res.status(statusCode).json({
    EC: errorCode,
    EM: message,
    data: null,
  });
};

module.exports = { notFoundHandler, errorHandler };
