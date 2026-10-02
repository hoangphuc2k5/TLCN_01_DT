class ApiError extends Error {
  constructor(statusCode, message, errorCode = 1) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
  }
}

module.exports = ApiError;
