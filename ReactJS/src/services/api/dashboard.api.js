import axios from '../../config/http-client';

export const getDashboardApi = () => axios.get('/v1/api/dashboard');
