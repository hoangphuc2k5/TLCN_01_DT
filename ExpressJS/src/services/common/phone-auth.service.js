function createPhoneAuthService(dependencies) {
  const persistence = dependencies.persistence;
  const crypto = require('node:crypto');
  const ApiError = require("../../utils/common/api-error.util");
  const security = dependencies.services["auth-security"];
  const delivery = dependencies.services["notification-delivery"];
  const { STATUS } = require("../../config/constants/status.config");
  
  const normalizePhone = value => {
    let phone = String(value || '').trim().replace(/[\s().-]/g, '');
    if (!phone) throw new ApiError(400, 'Số điện thoại không được để trống');
    if (phone.startsWith('0')) {
      phone = '+84' + phone.slice(1);
    } else if (phone.startsWith('84') && !phone.startsWith('+84')) {
      phone = '+' + phone;
    } else if (!phone.startsWith('+')) {
      phone = '+84' + phone;
    }
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new ApiError(400, 'Số điện thoại không hợp lệ');
    return phone;
  };

  const getPhoneVariants = phone => {
    const raw = String(phone || '').trim().replace(/[\s().-]/g, '');
    const variants = new Set([phone, raw]);
    if (raw.startsWith('+84')) {
      variants.add('0' + raw.slice(3));
      variants.add(raw.slice(1));
      variants.add(raw.slice(3));
    } else if (raw.startsWith('0')) {
      variants.add('+84' + raw.slice(1));
      variants.add('84' + raw.slice(1));
      variants.add(raw.slice(1));
    } else if (raw.startsWith('84')) {
      variants.add('+' + raw);
      variants.add('0' + raw.slice(2));
      variants.add(raw.slice(2));
    }
    return Array.from(variants).filter(Boolean);
  };

  const hash = (phone, code) => crypto.createHash('sha256').update(`${phone}:${code}:${process.env.JWT_SECRET || 'phone'}`).digest('hex');
  
  const requestCode = async (phoneValue, channelValue = 'SMS') => {
    const channel = String(channelValue || 'SMS').toUpperCase();
    if (!['SMS', 'ZALO'].includes(channel)) {
      throw new ApiError(400, 'Kênh gửi OTP không hợp lệ (hỗ trợ SMS, ZALO)');
    }
    const phone = normalizePhone(phoneValue);
    const variants = getPhoneVariants(phone);
    const user = await persistence.userFindOne({ phone: { $in: variants }, status: STATUS.ACTIVE });
    if (!user) throw new ApiError(404, 'Không tìm thấy tài khoản hoạt động liên kết với số điện thoại này');
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const challenge = await persistence.challengeCreate({ phone, userId: user._id, codeHash: hash(phone, code), expiresAt: new Date(Date.now() + 5 * 60 * 1000) });
    const send = await delivery.deliverChannel(channel, phone, `Your ${process.env.APP_NAME || 'EduMoet'} login code is ${code}`);
    return { challengeId: challenge._id, expiresAt: challenge.expiresAt, channel, delivery: send, ...(process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development' ? { devCode: code } : {}) };
  };


  const verifyCode = async (challengeId, codeValue) => {
    if (!/^[a-f\d]{24}$/i.test(String(challengeId)) || !/^\d{6}$/.test(String(codeValue))) throw new ApiError(400, 'Mã OTP không hợp lệ');
    const challenge = await persistence.challengeFindOne({ _id: challengeId, consumedAt: null, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } });
    if (!challenge) throw new ApiError(401, 'Mã OTP hết hạn hoặc đã bị khóa');
    const valid = hash(challenge.phone, codeValue) === challenge.codeHash;
    await persistence.verifyCodeUpdateOne({ _id: challenge._id, consumedAt: null }, { $inc: { attempts: 1 }, ...(valid ? { $set: { consumedAt: new Date() } } : {}) });
    if (!valid) throw new ApiError(401, 'Mã OTP không đúng');
    const user = await persistence.userFindOne2({ _id: challenge.userId, status: STATUS.ACTIVE });
    if (!user) throw new ApiError(401, 'Tài khoản không hợp lệ');
    return security.beginLogin(user);
  };
  return { normalizePhone, getPhoneVariants, requestCode, verifyCode };

  
}

class PhoneAuthService {
  constructor(dependencies) {
    Object.assign(this, createPhoneAuthService(dependencies));
  }
}

module.exports = PhoneAuthService;
