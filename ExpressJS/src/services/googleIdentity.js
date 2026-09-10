const { OAuth2Client } = require('google-auth-library');
const ApiError = require('../utils/ApiError');
const { assertGmailOnly } = require('../utils/gmail');
const client = new OAuth2Client();

async function verify(credential, { fresh = false } = {}) {
  if (!process.env.GOOGLE_CLIENT_ID) throw new ApiError(503, 'Chưa cấu hình đăng nhập Google.');
  if (typeof credential !== 'string' || !credential || credential.length > 8192) throw new ApiError(400, 'Thiếu Google credential hợp lệ.');
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch { throw new ApiError(401, 'Google token không hợp lệ hoặc đã hết hạn.'); }
  if (!payload?.email_verified || !payload.sub || !payload.email) throw new ApiError(403, 'Email Google chưa được xác minh.');
  assertGmailOnly(payload.email);
  if (fresh && (!Number.isFinite(payload.iat) || Math.abs(Date.now() / 1000 - payload.iat) > 300)) {
    throw new ApiError(401, 'Vui lòng xác minh lại bằng Google.');
  }
  return { ...payload, email: payload.email.toLowerCase().trim() };
}
module.exports = { verify };
