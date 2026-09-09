const crypto = require('node:crypto');
const ApiError = require('../utils/ApiError');

const b64 = value => Buffer.from(value).toString('base64url');
const verifyAssertion = assertion => {
  const secret = process.env.ENTERPRISE_SSO_SECRET;
  if (!secret) throw new ApiError(503, 'Enterprise SSO chua duoc cau hinh');
  if (typeof assertion !== 'string') throw new ApiError(400, 'SSO assertion khong hop le');
  const [encoded, signature] = assertion.split('.'); if (!encoded || !signature) throw new ApiError(400, 'SSO assertion khong hop le');
  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new ApiError(401, 'SSO signature khong hop le');
  let payload; try { payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); } catch { throw new ApiError(400, 'SSO payload khong hop le'); }
  if (!payload.sub || !payload.email || (payload.exp && Number(payload.exp) <= Math.floor(Date.now() / 1000))) throw new ApiError(401, 'SSO assertion het han');
  if (process.env.ENTERPRISE_SSO_ISSUER && payload.iss !== process.env.ENTERPRISE_SSO_ISSUER) throw new ApiError(401, 'SSO issuer khong hop le');
  if (process.env.ENTERPRISE_SSO_AUDIENCE && payload.aud !== process.env.ENTERPRISE_SSO_AUDIENCE) throw new ApiError(401, 'SSO audience khong hop le');
  return payload;
};
const signForTest = payload => { const encoded = b64(JSON.stringify(payload)); return `${encoded}.${crypto.createHmac('sha256', process.env.ENTERPRISE_SSO_SECRET || '').update(encoded).digest('base64url')}`; };
module.exports = { verifyAssertion, signForTest };
