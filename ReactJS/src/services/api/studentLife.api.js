import axios from '../../config/http-client';

export const getRewardsApi = (params) => axios.get('/v1/api/rewards', { params });

export const createRewardApi = (data) => axios.post('/v1/api/rewards', data);

export const reviewRewardApi = (id, data) => axios.patch(`/v1/api/rewards/${id}/review`, data);

export const createAdmissionApi = (data) => axios.post('/v1/api/admissions/public', data);

export const getAdmissionStatusApi = (code) => axios.get(`/v1/api/admissions/public/${encodeURIComponent(code)}`);

export const getAdmissionsApi = (params) => axios.get('/v1/api/admissions', { params });

export const reviewAdmissionApi = (id, data) => axios.patch(`/v1/api/admissions/${id}/review`, data);

export const enrollAdmissionApi = (id, data) => axios.post(`/v1/api/admissions/${id}/enroll`, data);

export const getClassActivitiesApi = (params) => axios.get('/v1/api/class-activities', { params });

export const publishClassActivityApi = (id) => axios.patch(`/v1/api/class-activities/${id}/publish`);

export const getParentMeetingsApi = () => axios.get('/v1/api/parent-meetings');

export const createParentMeetingApi = (data) => axios.post('/v1/api/parent-meetings', data);

export const cancelParentMeetingApi = (id) => axios.patch(`/v1/api/parent-meetings/${id}/cancel`);

export const rsvpParentMeetingApi = (id, data) => axios.patch(`/v1/api/parent-meetings/${id}/rsvp`, data);

export const getClubsApi = () => axios.get('/v1/api/clubs');

export const createClubApi = (data) => axios.post('/v1/api/clubs', data);

export const registerClubApi = (id) => axios.post(`/v1/api/clubs/${id}/register`);

export const getClubRegistrationsApi = () => axios.get('/v1/api/club-registrations');

export const getConductApi = (params) => axios.get('/v1/api/conduct', { params });

export const upsertConductApi = (data) => axios.post('/v1/api/conduct', data);
