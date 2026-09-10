const OTPAuth = require('otpauth');
const { randomBytes, createCipheriv, createDecipheriv, createHash } = require('node:crypto');
const ApiError = require('../utils/ApiError');

const available = () => /^[a-f0-9]{64}$/i.test(process.env.AUTH_MFA_ENCRYPTION_KEY || '');
function key() {
  if (!available()) throw new ApiError(503, 'Chưa cấu hình khóa mã hóa 2FA. Liên hệ quản trị hệ thống.');
  return Buffer.from(process.env.AUTH_MFA_ENCRYPTION_KEY, 'hex');
}
function encrypt(secret, userId) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(String(userId)));
  const data = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(b => b.toString('base64url')).join('.');
}
function decrypt(value, userId) {
  const encryptionKey = key();
  try {
    const [iv, tag, data] = value.split('.').map(s => Buffer.from(s, 'base64url'));
    const cipher = createDecipheriv('aes-256-gcm', encryptionKey, iv);
    cipher.setAAD(Buffer.from(String(userId))); cipher.setAuthTag(tag);
    return Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8');
  } catch { throw new ApiError(503, 'Không giải mã được cấu hình 2FA. Liên hệ quản trị hệ thống.'); }
}
const totp = (secret, label = '') => new OTPAuth.TOTP({ issuer: 'EduMoet', label, algorithm: 'SHA1', digits: 6, period: 30, secret });
function create(user) {
  const secret = new OTPAuth.Secret({ size: 20 }).base32;
  return { secret, uri: totp(secret, user.email).toString(), encrypted: encrypt(secret, user._id) };
}
function counter(encrypted, userId, token, now = Date.now()) {
  if (typeof token !== 'string' || !/^\d{6}$/.test(token)) return null;
  const delta = totp(decrypt(encrypted, userId)).validate({ token, timestamp: now, window: 1 });
  return delta === null ? null : Math.floor(now / 30000) + delta;
}
const digest = value => createHash('sha256').update(value).digest('hex');
const recoveryCodes = () => Array.from({ length: 10 }, () => randomBytes(16).toString('hex'));
module.exports = { available, create, counter, digest, recoveryCodes };
