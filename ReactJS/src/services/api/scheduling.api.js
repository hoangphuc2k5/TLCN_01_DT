import axios from '../../config/http-client';

export const getAppointmentsApi = (params) => axios.get('/v1/api/appointments', { params });

export const createAppointmentApi = (data) => axios.post('/v1/api/appointments', data);

export const reviewAppointmentApi = (id, data) => axios.patch(`/v1/api/appointments/${id}/review`, data);

export const cancelAppointmentApi = (id) => axios.patch(`/v1/api/appointments/${id}/cancel`);

export const getSurveysApi = () => axios.get('/v1/api/surveys');

export const submitSurveyApi = (id, data) => axios.post(`/v1/api/appointments/${id}/survey`, data);

export const cancelMakeupApi = (id, data) => axios.patch(`/v1/api/leave-requests/${id}/cancel-makeup`, data);

export const getLeavesApi = (params) => axios.get('/v1/api/leave-requests', { params });

export const createLeaveApi = (data) => axios.post('/v1/api/leave-requests', data);

export const reviewLeaveApi = (id, data) =>
  axios.patch(`/v1/api/leave-requests/${id}/review`, data);

export const getDatedScheduleApi = (params) => axios.get('/v1/api/timetables/schedule', { params });

export const getTimetablesApi = (params) => axios.get('/v1/api/timetables', { params });

export const upsertTimetableApi = (data) => axios.post('/v1/api/timetables', data);

export const approveTimetableApi = (id) => axios.patch(`/v1/api/timetables/${id}/approve`);

export const getCalendarApi = (params) => axios.get('/v1/api/calendar', { params });

export const createCalendarApi = (data) => axios.post('/v1/api/calendar', data);

export const deleteCalendarApi = (id) => axios.delete(`/v1/api/calendar/${id}`);
