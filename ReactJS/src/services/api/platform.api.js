import axios from '../../config/http-client';

export const searchApi = (q) => axios.get('/v1/api/search', { params: { q } });
