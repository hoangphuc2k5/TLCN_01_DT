import axios from '../../config/http-client';

export const loginApi = (email, password) =>
  axios.post('/v1/api/auth/login', { email, password });

export const getMeApi = () => axios.get('/v1/api/auth/me');

export const verifyMfaApi = (data) => axios.post('/v1/api/auth/mfa/verify', data);

export const getSecurityApi = () => axios.get('/v1/api/auth/security');

export const securityActionApi = (action, data) => axios.post(`/v1/api/auth/${action}`, data);

export const updateProfileApi = (data) => axios.put('/v1/api/auth/profile', data);

export const getAuthConfigApi = () => axios.get('/v1/api/auth/config');

export const loginGoogleApi = (credential) =>
  axios.post('/v1/api/auth/google', { credential });

export const requestPhoneLoginApi = (phone, channel = 'SMS') => axios.post('/v1/api/auth/phone/request', { phone, channel });

export const verifyPhoneLoginApi = (challengeId, code) => axios.post('/v1/api/auth/phone/verify', { challengeId, code });

export const loginSsoApi = assertion => axios.post('/v1/api/auth/sso', { assertion });

