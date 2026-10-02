import axios from 'axios';

const resolveBaseURL = () => import.meta.env.VITE_BACKEND_URL || '';

const instance = axios.create({
  baseURL: resolveBaseURL(),
});

instance.interceptors.request.use(
  (config) => {
    // Luôn resolve lại khi request (tránh baseURL sai lúc build)
    config.baseURL = resolveBaseURL();
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

instance.interceptors.response.use(
  (response) => (response?.data !== undefined ? response.data : response),
  (error) => {
    if (error?.response?.status === 401 && !error.config?.url?.startsWith('/v1/api/online-payments/vnpay/return')) {
      localStorage.removeItem('access_token');
    }
    if (error?.response?.data) return error.response.data;
    return Promise.reject(error);
  }
);

export default instance;
