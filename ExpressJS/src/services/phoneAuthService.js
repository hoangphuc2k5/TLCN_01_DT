const crypto = require('node:crypto');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const Challenge = require('../models/PhoneLoginChallenge');
const security = require('./authSecurityService');
const delivery = require('./notificationDeliveryService');
const { STATUS } = require('../constants/status');

const normalizePhone = value => { const phone = String(value || '').replace(/[\s().-]/g, ''); if (!/^\+?[1-9]\d{7,14}$/.test(phone)) throw new ApiError(400, 'So dien thoai khong hop le'); return phone; };
const hash = (phone, code) => crypto.createHash('sha256').update(`${phone}:${code}:${process.env.JWT_SECRET || 'phone'}`).digest('hex');
const requestCode = async phoneValue => {
  const phone = normalizePhone(phoneValue); const user = await User.findOne({ phone, status: STATUS.ACTIVE }).select('_id');
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0'); const challenge = await Challenge.create({ phone, userId: user?._id || null, codeHash: hash(phone, code), expiresAt: new Date(Date.now() + 5 * 60 * 1000) });
  const send = await delivery.deliverChannel('SMS', phone, `Your ${process.env.APP_NAME || 'EduMoet'} login code is ${code}`);
  return { challengeId: challenge._id, expiresAt: challenge.expiresAt, delivery: send, ...(process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development' ? { devCode: code } : {}) };
};
const verifyCode = async (challengeId, codeValue) => {
  if (!/^[a-f\d]{24}$/i.test(String(challengeId)) || !/^\d{6}$/.test(String(codeValue))) throw new ApiError(400, 'Ma OTP khong hop le');
  const challenge = await Challenge.findOne({ _id: challengeId, consumedAt: null, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } }); if (!challenge) throw new ApiError(401, 'Ma OTP het han hoac da bi khoa');
  const valid = hash(challenge.phone, codeValue) === challenge.codeHash; await Challenge.updateOne({ _id: challenge._id, consumedAt: null }, { $inc: { attempts: 1 }, ...(valid ? { $set: { consumedAt: new Date() } } : {}) });
  if (!valid) throw new ApiError(401, 'Ma OTP khong dung');
  const user = await User.findOne({ _id: challenge.userId, phone: challenge.phone, status: STATUS.ACTIVE }).select('+security'); if (!user) throw new ApiError(401, 'Tai khoan khong hop le');
  return security.beginLogin(user);
};
module.exports = { normalizePhone, requestCode, verifyCode };
