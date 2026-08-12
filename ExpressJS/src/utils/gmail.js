const isGmailAddress = (email = '') => {
  const normalized = String(email).toLowerCase().trim();
  return /@(gmail|googlemail)\.com$/i.test(normalized);
};

const assertGmailOnly = (email) => {
  if (process.env.AUTH_GMAIL_ONLY === 'false') return true;
  if (!isGmailAddress(email)) {
    const err = new Error('Hệ thống chỉ chấp nhận đăng nhập bằng tài khoản Gmail (@gmail.com)');
    err.statusCode = 403;
    err.errorCode = 403;
    throw err;
  }
  return true;
};

module.exports = { isGmailAddress, assertGmailOnly };
