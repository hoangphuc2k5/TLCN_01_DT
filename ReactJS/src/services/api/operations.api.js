import axios from '../../config/http-client';

export const getEquipmentApi = (params) => axios.get('/v1/api/equipment', { params });

export const createEquipmentApi = (data) => axios.post('/v1/api/equipment', data);

export const updateEquipmentApi = (id, data) => axios.put(`/v1/api/equipment/${id}`, data);

export const getEquipmentMaintenanceApi = (params) => axios.get('/v1/api/equipment-maintenance', { params });

export const createEquipmentMaintenanceApi = (data) => axios.post('/v1/api/equipment-maintenance', data);

export const updateEquipmentMaintenanceApi = (id, data) => axios.patch(`/v1/api/equipment-maintenance/${id}`, data);

export const getBooksApi = (params) => axios.get('/v1/api/library/books', { params });

export const createBookApi = (data) => axios.post('/v1/api/library/books', data);

export const getLoansApi = (params) => axios.get('/v1/api/library/loans', { params });

export const borrowBookApi = (data) => axios.post('/v1/api/library/loans', data);

export const returnBookApi = (id) => axios.patch(`/v1/api/library/loans/${id}/return`);

export const getFacilitiesApi = (params) => axios.get('/v1/api/facilities', { params });

export const createFacilityApi = (data) => axios.post('/v1/api/facilities', data);

export const reviewFacilityApi = (id, data) => axios.patch(`/v1/api/facilities/${id}/review`, data);
