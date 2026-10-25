import axios from '../../config/http-client';

export const getFeesApi = (params) => axios.get('/v1/api/fees', { params });

export const createFeeApi = (data) => axios.post('/v1/api/fees', data);

export const recordPaymentApi = (data) => axios.post('/v1/api/payments', data);

export const getFeeDebtorsApi = (params) => axios.get('/v1/api/fees/debtors', { params });

export const runFeeRemindersApi = (data = {}) => axios.post('/v1/api/fees/reminders/run', data);

export const getPayrollApi = (params) => axios.get('/v1/api/payroll', { params });

export const createPayrollApi = (data) => axios.post('/v1/api/payroll', data);

export const updatePayrollStatusApi = (id, status) => axios.patch(`/v1/api/payroll/${id}/status`, { status });

export const createOnlinePaymentApi = (data) => axios.post('/v1/api/online-payments', data);

export const getOnlinePaymentsApi = (params) => axios.get('/v1/api/online-payments', { params });

export const getOnlinePaymentApi = (id) => axios.get(`/v1/api/online-payments/${id}`);

export const verifyVnpayReturnApi = query => axios.get(`/v1/api/online-payments/vnpay/return${query}`);
