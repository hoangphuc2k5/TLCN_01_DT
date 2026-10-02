const success = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    EC: 0,
    EM: message,
    data,
  });
};

const failure = (res, message = 'Error', errorCode = 1, statusCode = 400, data = null) => {
  return res.status(statusCode).json({
    EC: errorCode,
    EM: message,
    data,
  });
};

module.exports = { success, failure };
