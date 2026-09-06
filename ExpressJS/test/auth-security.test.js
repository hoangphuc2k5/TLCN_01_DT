const { test, before, beforeEach, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const OTPAuth = require('otpauth');
const { MongoMemoryServer } = require('mongodb-memory-server');
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: 'isolated-auth-tests', AUTH_MFA_ENCRYPTION_KEY: 'ab'.repeat(32), ALLOW_PASSWORD_LOGIN: 'true', AUTH_GMAIL_ONLY: 'false', GOOGLE_CLIENT_ID: '', GMAIL_USER: '', GMAIL_APP_PASSWORD: '' });
const app = require('../src/app');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const AuthAttempt = require('../src/models/AuthAttempt');
const auth = require('../src/services/authService');
const security = require('../src/services/authSecurityService');
const policy = require('../src/services/passwordPolicy');
const repo = require('../src/repositories/authSecurityRepository');
const throttle = require('../src/services/authThrottle');
const password = 'A private passphrase 2026!';
let mongo, server, origin, user, hash;
before(async () => {
  mongo = await MongoMemoryServer.create({ binary: { downloadDir: path.resolve(__dirname, '../node_modules/.cache/mongodb-memory-server') } });
  await mongoose.connect(mongo.getUri());
  await Role.create({ code: 'SUPER_ADMIN', name: 'Super', level: 100, permissions: [] });
  await require('../src/services/rolePermissionCache').reload();
  await Promise.all([User.init(), AuthAttempt.init()]);
  hash = await bcrypt.hash(password, 4);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}/v1/api`;
});
beforeEach(async () => {
  mock.restoreAll();
  process.env.AUTH_MFA_ENCRYPTION_KEY = 'ab'.repeat(32);
  await User.deleteMany({}); await AuthAttempt.deleteMany({});
  user = await User.create({ name: 'Security test', email: 'security@test.invalid', role: 'SUPER_ADMIN', password: hash });
});
after(async () => { mock.restoreAll(); if (server) await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); if (mongo) await mongo.stop(); });
const request = (url, token, data) => fetch(`${origin}${url}`, { method: data === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
const login = () => auth.login(user.email, password);
const code = (secret, delta = 0) => new OTPAuth.TOTP({ secret }).generate({ timestamp: Date.now() + delta * 30000 });
async function enroll() {
  const setup = await security.startSetup(user._id, { currentPassword: password });
  const enabled = await security.confirmSetup(user._id, { code: code(setup.secret) });
  return { ...setup, ...enabled };
}

test('password policy allows long phrases and Unicode; rejects short, oversized, obvious and email-containing passwords', async () => {
  policy.validate('Một cụm từ bí mật rất dài!');
  for (const value of [null, {}, 'short', 'x'.repeat(15), 'á'.repeat(37), 'password123456789', `prefix ${user.email}`]) assert.throws(() => policy.validate(value, user), e => e.statusCode === 400);
  await assert.rejects(auth.hashPassword('short'), e => e.statusCode === 400);
});

test('enrollment requires primary proof and configured encryption; setup is encrypted and hidden from normal reads', async () => {
  await assert.rejects(security.startSetup(user._id, { currentPassword: 'wrong' }), e => e.statusCode === 400);
  process.env.AUTH_MFA_ENCRYPTION_KEY = '';
  await assert.rejects(security.startSetup(user._id, { currentPassword: password }), e => e.statusCode === 503);
  process.env.AUTH_MFA_ENCRYPTION_KEY = 'ab'.repeat(32);
  const setup = await security.startSetup(user._id, { currentPassword: password });
  const stored = await repo.load(user._id);
  assert.notEqual(stored.security.setup.secret, setup.secret);
  assert.ok(!JSON.stringify(stored.security).includes(setup.secret));
  assert.equal((await User.findById(user._id)).security, undefined);
  assert.equal(stored.toSafeObject().security, undefined);
  assert.equal(stored.toSafeObject().password, undefined);
  assert.equal((await login()).mfaRequired, undefined);
});

test('setup expiration, invalid OTP and replaced setup cannot enable MFA', async () => {
  const old = await security.startSetup(user._id, { currentPassword: password });
  await User.updateOne({ _id: user._id }, { 'security.setup.expiresAt': new Date(0) });
  await assert.rejects(security.confirmSetup(user._id, { code: code(old.secret) }), e => e.statusCode === 400);
  await security.startSetup(user._id, { currentPassword: password });
  await assert.rejects(security.confirmSetup(user._id, { code: 'invalid' }), e => e.statusCode === 400);
  assert.equal((await repo.load(user._id)).security.mfaEnabled, false);
});

test('MFA login issues no access token before proof; enrollment revokes legacy and current sessions', async () => {
  const old = await login();
  const enabled = await enroll();
  const challenge = await login();
  assert.equal(challenge.access_token, undefined); assert.equal(challenge.mfaRequired, true);
  assert.equal((await request('/auth/me', old.access_token)).status, 401);
  assert.equal((await request('/auth/me', jwt.sign({ _id: user._id }, process.env.JWT_SECRET))).status, 401);
  assert.equal((await request('/auth/me', challenge.challengeToken)).status, 401);
  const session = await security.verifyLogin({ ...challenge, code: enabled.recoveryCodes[0] });
  assert.ok(session.access_token); assert.equal(session.user.security, undefined);
  const me = await request('/auth/me', session.access_token);
  assert.equal(me.status, 200); assert.equal((await me.json()).data.security, undefined);
});

test('parallel recovery redemption consumes exactly one code and challenge; replay fails', async () => {
  const enabled = await enroll();
  const challenge = await login();
  const attempts = await Promise.allSettled(Array.from({ length: 4 }, () => security.verifyLogin({ ...challenge, code: enabled.recoveryCodes[0] })));
  assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await repo.load(user._id)).security.recoveryHashes.length, 9);
  await assert.rejects(security.verifyLogin({ ...challenge, code: enabled.recoveryCodes[1] }));
  const next = await login();
  await assert.rejects(security.verifyLogin({ ...next, code: enabled.recoveryCodes[0] }), e => e.statusCode === 400);
  assert.ok((await security.verifyLogin({ ...next, code: enabled.recoveryCodes[1] })).access_token);
});

test('TOTP replay across challenges is rejected; a fresh counter succeeds only once', async () => {
  const enabled = await enroll();
  let challenge = await login();
  // Use a known fixed timestamp to keep the boundary deterministic without sleeps.
  const timestamp = Math.floor(Date.now() / 30000) * 30000 + 1000;
  await User.updateOne({ _id: user._id }, { 'security.lastCounter': Math.floor(timestamp / 30000) - 1 });
  mock.method(Date, 'now', () => timestamp);
  const token = code(enabled.secret);
  assert.ok((await security.verifyLogin({ ...challenge, code: token })).access_token);
  challenge = await login();
  await assert.rejects(security.verifyLogin({ ...challenge, code: token }), e => e.statusCode === 400);
});

test('new challenge invalidates old challenge; expiry, inactive account and inactive role fail closed', async () => {
  const enabled = await enroll(); const old = await login(); let challenge = await login();
  await assert.rejects(security.verifyLogin({ ...old, code: enabled.recoveryCodes[0] }));
  await User.updateOne({ _id: user._id }, { 'security.challenge.expiresAt': new Date(0) });
  await assert.rejects(security.verifyLogin({ ...challenge, code: enabled.recoveryCodes[0] }));
  challenge = await login();
  await User.updateOne({ _id: user._id }, { status: 'INACTIVE' });
  await assert.rejects(security.verifyLogin({ ...challenge, code: enabled.recoveryCodes[0] }), e => e.statusCode === 401);
  await User.updateOne({ _id: user._id }, { status: 'ACTIVE' });
  mock.method(require('../src/services/rolePermissionCache'), 'getRole', async () => null);
  await assert.rejects(security.verifyLogin({ ...challenge, code: enabled.recoveryCodes[0] }), e => e.statusCode === 403);
});

test('factor changes require primary and factor proof; rotation invalidates old recovery codes and sessions', async () => {
  const enabled = await enroll(); const challenge = await login();
  const session = await security.verifyLogin({ ...challenge, code: enabled.recoveryCodes[0] });
  await assert.rejects(security.changeFactors(user._id, { code: enabled.recoveryCodes[1] }, true), e => e.statusCode === 400);
  await assert.rejects(security.changeFactors(user._id, { currentPassword: password, code: 'invalid' }, true), e => e.statusCode === 400);
  const rotated = await security.changeFactors(user._id, { currentPassword: password, code: enabled.recoveryCodes[1] }, false);
  assert.equal(rotated.recoveryCodes.length, 10);
  assert.equal((await request('/auth/me', session.access_token)).status, 401);
  const next = await login();
  await assert.rejects(security.verifyLogin({ ...next, code: enabled.recoveryCodes[2] }));
  await security.changeFactors(user._id, { currentPassword: password, code: rotated.recoveryCodes[0] }, true);
  const stored = await repo.load(user._id);
  assert.equal(stored.security.mfaEnabled, false); assert.equal(stored.security.secret, null);
  assert.ok((await login()).access_token);
});

test('missing encryption key never bypasses MFA and recovery codes still work', async () => {
  const enabled = await enroll(); const challenge = await login();
  process.env.AUTH_MFA_ENCRYPTION_KEY = '';
  await assert.rejects(security.verifyLogin({ ...challenge, code: code(enabled.secret, 1) }), e => e.statusCode === 503);
  assert.ok((await security.verifyLogin({ ...challenge, code: enabled.recoveryCodes[0] })).access_token);
});

test('password changes enforce history, revoke sessions and require MFA for enrolled users', async () => {
  const enabled = await enroll();
  const nextPassword = 'A completely different secret 2027!';
  await assert.rejects(security.changePassword(user._id, { currentPassword: password, newPassword: nextPassword }), e => e.statusCode === 400);
  await security.changePassword(user._id, { currentPassword: password, code: enabled.recoveryCodes[0], newPassword: nextPassword });
  const stored = await repo.load(user._id);
  assert.equal(await bcrypt.compare(nextPassword, stored.password), true);
  assert.equal(stored.security.passwordHistory.length, 1);
  await assert.rejects(security.changePassword(user._id, { currentPassword: nextPassword, code: enabled.recoveryCodes[1], newPassword: password }), e => e.statusCode === 400);
  assert.ok(stored.security.mfaEnabled);
});

test('admin reset creates distinct temporary passwords, revokes sessions, forces change and keeps MFA', async () => {
  const actor = await User.create({ name: 'Admin', role: 'SUPER_ADMIN', email: 'admin@test.invalid' });
  const old = await login();
  const users = require('../src/services/userService');
  const first = await users.resetPassword(actor, user._id);
  const second = await users.resetPassword(actor, user._id);
  assert.notEqual(first.defaultPassword, second.defaultPassword);
  assert.equal((await request('/auth/me', old.access_token)).status, 401);
  const session = await auth.login(user.email, second.defaultPassword);
  assert.equal(session.mustChangePassword, true);
  assert.equal((await request('/dashboard', session.access_token)).status, 403);
  assert.equal((await request('/auth/security', session.access_token)).status, 200);
  assert.equal((await request('/auth/mfa/setup', session.access_token, { currentPassword: second.defaultPassword })).status, 403);
  const changed = await request('/auth/password', session.access_token, { currentPassword: second.defaultPassword, newPassword: 'My personal new passphrase!' });
  assert.equal(changed.status, 200);
  assert.equal((await auth.login(user.email, 'My personal new passphrase!')).mustChangePassword, false);
  const setup = await security.startSetup(user._id, { currentPassword: 'My personal new passphrase!' });
  await security.confirmSetup(user._id, { code: code(setup.secret) });
  const reset = await users.resetPassword(actor, user._id);
  assert.equal((await auth.login(user.email, reset.defaultPassword)).mfaRequired, true);
});

test('shared atomic throttle limits parallel guesses and recovers at next window without TTL deletion', async () => {
  const now = 1200000;
  const attempts = await Promise.allSettled(Array.from({ length: 16 }, () => throttle.consume('test', 'account', 5, now)));
  assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 5);
  assert.ok(attempts.filter(r => r.status === 'rejected').every(r => r.reason.statusCode === 429));
  await throttle.consume('test', 'account', 5, now + throttle.WINDOW_MS);
});

test('login and MFA budgets are account based; a new challenge cannot reset factor budget', async () => {
  for (let i = 0; i < 10; i++) await assert.rejects(auth.login(user.email, 'wrong'), e => e.statusCode === 401);
  await assert.rejects(login(), e => e.statusCode === 429);
  await AuthAttempt.deleteMany({});
  await enroll();
  let challenge = await login();
  for (let i = 0; i < 10; i++) await assert.rejects(security.verifyLogin({ ...challenge, code: 'wrong' }), e => e.statusCode === 400);
  challenge = await login();
  await assert.rejects(security.verifyLogin({ ...challenge, code: 'wrong' }), e => e.statusCode === 429);
});

test('stale repository snapshots cannot overwrite a password reset or enrollment', async () => {
  const snapshot = await repo.load(user._id);
  await repo.update(snapshot, { 'security.mustChangePassword': true });
  await assert.rejects(repo.update(snapshot, { 'security.mustChangePassword': false }), e => e.statusCode === 409);
});

test('Google sign-in also requires MFA; reauthentication is bound to the same Google identity', async () => {
  const enabled = await enroll();
  const google = require('../src/services/googleIdentity');
  const verify = mock.method(google, 'verify', async () => ({ sub: 'google-sub', email: user.email, email_verified: true, iat: Math.floor(Date.now() / 1000) }));
  const challenge = await auth.loginWithGoogle('mock-verified-token');
  assert.equal(challenge.mfaRequired, true); assert.equal(challenge.access_token, undefined);
  assert.ok((await security.verifyLogin({ ...challenge, code: enabled.recoveryCodes[0] })).access_token);
  await security.changeFactors(user._id, { credential: 'mock-verified-token', code: enabled.recoveryCodes[1] }, false);
  verify.mock.mockImplementation(async () => ({ sub: 'another-user', email: 'other@test.invalid' }));
  await assert.rejects(security.changeFactors(user._id, { credential: 'wrong-user', code: enabled.recoveryCodes[2] }, true), e => e.statusCode === 400);
});

test('unknown paths do not inherit public access; token purpose and secret serialization are enforced', async () => {
  assert.equal((await request('/auth/login/anything')).status, 401);
  const token = jwt.sign({ _id: user._id, purpose: 'mfa' }, process.env.JWT_SECRET);
  assert.equal((await request('/auth/me', token)).status, 401);
  const valid = await login();
  const response = await request('/auth/security', valid.access_token);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json();
  for (const secret of ['password', 'secret', 'security', 'passwordHistory', 'recoveryHashes']) assert.equal(body.data[secret], undefined);
});

test('legacy users without security metadata can enroll and revoke their old sessions', async () => {
  await User.collection.updateOne({ _id: user._id }, { $unset: { security: '' } });
  const session = await login();
  assert.equal((await request('/auth/me', session.access_token)).status, 200);
  await enroll();
  assert.equal((await request('/auth/me', session.access_token)).status, 401);
});

test('encrypted setup cannot be copied to another account or decrypted using another key', async () => {
  const setup = await security.startSetup(user._id, { currentPassword: password });
  const stored = await repo.load(user._id);
  const other = await User.create({ name: 'Other', email: 'other@test.invalid', role: 'SUPER_ADMIN', password: hash, security: { setup: stored.security.setup } });
  await assert.rejects(security.confirmSetup(other._id, { code: code(setup.secret) }), e => e.statusCode === 503);
  process.env.AUTH_MFA_ENCRYPTION_KEY = 'cd'.repeat(32);
  await assert.rejects(security.confirmSetup(user._id, { code: code(setup.secret) }), e => e.statusCode === 503);
});

test('user creation applies the same policy and does not accept injected security state', async () => {
  const users = require('../src/services/userService');
  await assert.rejects(users.createUser(user, { name: 'New', email: 'new@test.invalid', role: 'SUPER_ADMIN', password: 'short' }), e => e.statusCode === 400);
  const created = await users.createUser(user, { name: 'New', email: 'new@test.invalid', role: 'SUPER_ADMIN', password, security: { mfaEnabled: true, sessionVersion: 999 } });
  assert.equal(created.security, undefined);
  assert.equal((await repo.load(created._id)).security.mfaEnabled, false);
});

test('Google adapter rejects stale reauthentication and unverified identity using mocked SDK only', async () => {
  const { OAuth2Client } = require('google-auth-library');
  const google = require('../src/services/googleIdentity');
  const old = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = 'isolated-google-audience';
  let identity = { sub: 'verified-sub', email: 'user@gmail.com', email_verified: true, iat: Math.floor(Date.now() / 1000) - 600 };
  mock.method(OAuth2Client.prototype, 'verifyIdToken', async ({ audience }) => { assert.equal(audience, 'isolated-google-audience'); return { getPayload: () => identity }; });
  try {
    await assert.rejects(google.verify('fixture-only', { fresh: true }), e => e.statusCode === 401);
    identity.iat = Math.floor(Date.now() / 1000);
    assert.equal((await google.verify('fixture-only', { fresh: true })).sub, 'verified-sub');
    identity.email_verified = false;
    await assert.rejects(google.verify('fixture-only'), e => e.statusCode === 403);
  } finally { process.env.GOOGLE_CLIENT_ID = old; }
});

test('import never falls back to a shared default password', async () => {
  const XLSX = require('xlsx');
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ name: 'Imported', email: 'imported@test.invalid', role: 'STUDENT' }]), 'Users');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const result = await require('../src/services/importService').importUsers({ ...user.toObject(), schoolId: new mongoose.Types.ObjectId() }, buffer);
  assert.equal(result.success, 0); assert.equal(result.failed, 1);
  assert.match(result.errors[0].message, /15/);
  assert.equal(await User.countDocuments({ email: 'imported@test.invalid' }), 0);
});

test('history checks all five recent passwords and remains bounded after replacement', async () => {
  const old = ['First private phrase!', 'Second private phrase!', 'Third private phrase!', 'Fourth private phrase!'];
  await User.updateOne({ _id: user._id }, { 'security.passwordHistory': await Promise.all(old.map(p => bcrypt.hash(p, 4))) });
  const stored = await repo.load(user._id);
  for (const previous of [password, ...old]) await assert.rejects(policy.replacement(stored, previous), e => e.statusCode === 400);
  const next = await policy.replacement(stored, 'A completely fresh phrase!');
  assert.equal(next.history.length, 4);
  assert.equal(next.history[0], hash);
});
