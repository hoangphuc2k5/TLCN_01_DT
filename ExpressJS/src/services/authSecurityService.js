const bcrypt = require('bcrypt');
const { randomBytes } = require('node:crypto');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const repo = require('../repositories/authSecurityRepository');
const otp = require('./totpProvider');
const policy = require('./passwordPolicy');
const throttle = require('./authThrottle');
const google = require('./googleIdentity');
const { STATUS } = require('../constants/status');
const { buildAuthPayload } = require('./authSessionService');

async function activeUser(id) {
  const user = await repo.load(id);
  if (!user || user.status !== STATUS.ACTIVE) throw new ApiError(401, 'Tài khoản không hợp lệ.');
  const role = await require('./rolePermissionCache').getRole(user.role);
  if (!role || !require('./roleService').visibleRole(user, role)) throw new ApiError(403, 'Vai trò không hợp lệ.');
  return user;
}

async function reauthenticate(user, { currentPassword, credential } = {}) {
  const attempt = await throttle.consume('primary', user.email);
  if (credential) {
    const identity = await google.verify(credential, { fresh: true });
    if ((user.googleId && user.googleId === identity.sub) || (!user.googleId && user.email === identity.email)) { await throttle.release(attempt); return; }
  } else if (user.password && typeof currentPassword === 'string' && Buffer.byteLength(currentPassword) <= 72 && await bcrypt.compare(currentPassword, user.password)) { await throttle.release(attempt); return; }
  throw new ApiError(400, 'Xác minh tài khoản thất bại.');
}

function statusOf(user) {
  return { mfaEnabled: !!user.security?.mfaEnabled, mfaAvailable: otp.available(),
    recoveryCodesRemaining: user.security?.recoveryHashes?.length || 0,
    hasPassword: !!user.password, mustChangePassword: !!user.security?.mustChangePassword,
    passwordChangedAt: user.security?.passwordChangedAt || null, passwordPolicy: policy.getPolicy(),
    googleClientId: process.env.GOOGLE_CLIENT_ID || '' };
}

async function beginLogin(user) {
  if (!user.security?.mfaEnabled) return buildAuthPayload(user);
  const challengeToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await repo.update(user, { 'security.challenge': { hash: otp.digest(challengeToken), expiresAt } });
  return { mfaRequired: true, challengeToken, expiresAt };
}

// Returns updates only. Proof and requested mutation are committed together by CAS.
function factorUpdates(user, code) {
  if (typeof code !== 'string' || code.length > 64) throw new ApiError(400, 'Mã xác thực không hợp lệ.');
  if (/^[a-f0-9]{32}$/i.test(code)) {
    const hash = otp.digest(code.toLowerCase());
    const hashes = user.security?.recoveryHashes || [];
    if (hashes.includes(hash)) return { 'security.recoveryHashes': hashes.filter(h => h !== hash) };
  } else {
    const counter = otp.counter(user.security.secret, user._id, code);
    if (counter !== null && counter > (user.security.lastCounter ?? -1)) return { 'security.lastCounter': counter };
  }
  throw new ApiError(400, 'Mã xác thực sai, hết hạn hoặc đã sử dụng.');
}

async function verifyLogin({ challengeToken, code } = {}) {
  if (typeof challengeToken !== 'string' || !/^[a-f0-9]{64}$/.test(challengeToken)) throw new ApiError(400, 'Phiên xác thực không hợp lệ.');
  const hash = otp.digest(challengeToken);
  const found = await User.findOne({ 'security.challenge.hash': hash, 'security.challenge.expiresAt': { $gt: new Date() } }).select('+security');
  if (!found) throw new ApiError(400, 'Phiên xác thực đã hết hạn. Hãy đăng nhập lại.');
  const attempt = await throttle.consume('factor', found._id);
  const user = await activeUser(found._id);
  if (!user.security?.mfaEnabled || user.security.challenge?.hash !== hash || user.security.challenge.expiresAt <= new Date()) throw new ApiError(400, 'Phiên xác thực không hợp lệ.');
  const updated = await repo.update(user, { ...factorUpdates(user, code), 'security.challenge': null }, {
    'security.challenge.expiresAt': { $gt: new Date() },
  });
  await throttle.release(attempt);
  return buildAuthPayload(updated);
}

async function startSetup(id, proof) {
  const user = await activeUser(id);
  if (user.security?.mfaEnabled) throw new ApiError(409, '2FA đã bật.');
  await reauthenticate(user, proof);
  const created = otp.create(user);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await repo.update(user, { 'security.setup': { secret: created.encrypted, expiresAt } });
  return { secret: created.secret, uri: created.uri, expiresAt };
}

const rotate = user => ({ 'security.sessionVersion': (user.security?.sessionVersion || 0) + 1, 'security.challenge': null, 'security.setup': null });

async function confirmSetup(id, { code } = {}) {
  const attempt = await throttle.consume('factor', id);
  const user = await activeUser(id);
  const setup = user.security?.setup;
  if (user.security?.mfaEnabled || !setup?.secret || !(setup.expiresAt > new Date())) throw new ApiError(400, 'Thiết lập đã hết hạn. Hãy bắt đầu lại.');
  const counter = otp.counter(setup.secret, id, code);
  if (counter === null) throw new ApiError(400, 'Mã xác thực không hợp lệ.');
  const recoveryCodes = otp.recoveryCodes();
  await repo.update(user, { ...rotate(user), 'security.mfaEnabled': true, 'security.secret': setup.secret,
    'security.lastCounter': counter, 'security.recoveryHashes': recoveryCodes.map(otp.digest) }, { 'security.setup.expiresAt': { $gt: new Date() } });
  await throttle.release(attempt);
  return { recoveryCodes, reauthenticate: true };
}

async function changeFactors(id, proof, disable) {
  const attempt = await throttle.consume('factor', id);
  const user = await activeUser(id);
  if (!user.security?.mfaEnabled) throw new ApiError(400, '2FA chưa bật.');
  await reauthenticate(user, proof);
  const consumed = factorUpdates(user, proof?.code);
  const recoveryCodes = disable ? [] : otp.recoveryCodes();
  await repo.update(user, { ...consumed, ...rotate(user),
    'security.mfaEnabled': !disable, 'security.secret': disable ? null : user.security.secret,
    'security.recoveryHashes': recoveryCodes.map(otp.digest) });
  await throttle.release(attempt);
  return { ...(disable ? {} : { recoveryCodes }), reauthenticate: true };
}

async function replacePassword(user, newPassword, mustChangePassword, extra = {}) {
  const replacement = await policy.replacement(user, newPassword);
  return repo.update(user, { ...extra, ...rotate(user), password: replacement.password,
    authProvider: user.googleId || user.authProvider !== 'password' ? 'both' : 'password',
    'security.passwordHistory': replacement.history, 'security.passwordChangedAt': new Date(),
    'security.mustChangePassword': mustChangePassword });
}

async function changePassword(id, proof) {
  const user = await activeUser(id);
  await reauthenticate(user, proof);
  let consumed = {};
  let attempt;
  if (user.security?.mfaEnabled) {
    attempt = await throttle.consume('factor', id);
    consumed = factorUpdates(user, proof?.code);
  }
  await replacePassword(user, proof?.newPassword, false, consumed);
  if (attempt) await throttle.release(attempt);
  return { reauthenticate: true };
}

module.exports = { activeUser, statusOf, beginLogin, verifyLogin, startSetup, confirmSetup,
  changeFactors, changePassword, replacePassword };
