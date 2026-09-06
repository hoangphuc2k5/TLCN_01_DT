const bcrypt = require('bcrypt');
const { randomBytes } = require('node:crypto');
const ApiError = require('../utils/ApiError');

const getPolicy = () => ({ minLength: 15, maxBytes: 72, historyCount: 5 });
const blocked = new Set(['passwordpassword', 'password123456789', '123456789012345', 'qwertyuiopasdfgh', 'letmeinletmeinletmein']);

function validate(password, user = {}) {
  const policy = getPolicy();
  if (typeof password !== 'string' || [...password].length < policy.minLength || Buffer.byteLength(password, 'utf8') > policy.maxBytes) {
    throw new ApiError(400, `Mật khẩu cần ít nhất ${policy.minLength} ký tự, tối đa ${policy.maxBytes} byte UTF-8.`);
  }
  const lower = password.toLowerCase();
  if (blocked.has(lower) || /^(password|qwerty|letmein|welcome|admin)[\W_\d]*$/i.test(password) || /^(.)\1+$/u.test(password) || (user.email && lower.includes(user.email.toLowerCase()))) {
    throw new ApiError(400, 'Mật khẩu quá dễ đoán hoặc chứa email tài khoản.');
  }
}

async function hash(password, user) { validate(password, user); return bcrypt.hash(password, 12); }
async function replacement(user, password) {
  validate(password, user);
  const previous = [user.password, ...(user.security?.passwordHistory || [])].filter(Boolean);
  for (const old of previous) {
    if (await bcrypt.compare(password, old)) throw new ApiError(400, 'Không được dùng lại 5 mật khẩu gần nhất.');
  }
  return { password: await hash(password, user), history: previous.slice(0, getPolicy().historyCount - 1) };
}
const temporaryPassword = () => randomBytes(18).toString('base64url');
module.exports = { getPolicy, validate, hash, replacement, temporaryPassword };
