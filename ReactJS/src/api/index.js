import axios from '../util/axios.customize';

export const loginApi = (email, password) =>
  axios.post('/v1/api/auth/login', { email, password });

export const getMeApi = () => axios.get('/v1/api/auth/me');

export const updateProfileApi = (data) => axios.put('/v1/api/auth/profile', data);

export const getDashboardApi = () => axios.get('/v1/api/dashboard');

export const getNotificationsApi = () => axios.get('/v1/api/notifications');

export const markNotificationReadApi = (id) =>
  axios.patch(`/v1/api/notifications/${id}/read`);

export const getClustersApi = () => axios.get('/v1/api/clusters');
export const createClusterApi = (data) => axios.post('/v1/api/clusters', data);
export const updateClusterApi = (id, data) => axios.put(`/v1/api/clusters/${id}`, data);
export const deleteClusterApi = (id) => axios.delete(`/v1/api/clusters/${id}`);

export const getSchoolsApi = (params) => axios.get('/v1/api/schools', { params });
export const createSchoolApi = (data) => axios.post('/v1/api/schools', data);
export const updateSchoolApi = (id, data) => axios.put(`/v1/api/schools/${id}`, data);
export const deleteSchoolApi = (id) => axios.delete(`/v1/api/schools/${id}`);

export const getUsersApi = (params) => axios.get('/v1/api/users', { params });
export const getUserDirectoryApi = (params) => axios.get('/v1/api/users/directory', { params });
export const createUserApi = (data) => axios.post('/v1/api/users', data);
export const updateUserApi = (id, data) => axios.put(`/v1/api/users/${id}`, data);
export const resetUserPasswordApi = (id) => axios.post(`/v1/api/users/${id}/reset-password`);
export const deleteUserApi = (id) => axios.delete(`/v1/api/users/${id}`);

export const getRolesApi = (params) => axios.get('/v1/api/roles', { params });
export const getAssignableRolesApi = () => axios.get('/v1/api/roles/assignable');
export const getPermissionCatalogApi = () => axios.get('/v1/api/roles/permission-catalog');
export const createRoleApi = (data) => axios.post('/v1/api/roles', data);
export const updateRoleApi = (id, data) => axios.put(`/v1/api/roles/${id}`, data);
export const deleteRoleApi = (id) => axios.delete(`/v1/api/roles/${id}`);

export const getAcademicYearsApi = () => axios.get('/v1/api/academic-years');
export const createAcademicYearApi = (data) => axios.post('/v1/api/academic-years', data);

export const getClassesApi = (params) => axios.get('/v1/api/classes', { params });
export const createClassApi = (data) => axios.post('/v1/api/classes', data);
export const updateClassApi = (id, data) => axios.put(`/v1/api/classes/${id}`, data);
export const deleteClassApi = (id) => axios.delete(`/v1/api/classes/${id}`);
export const getClassStudentsApi = (id) => axios.get(`/v1/api/classes/${id}/students`);

export const getSubjectsApi = () => axios.get('/v1/api/subjects');
export const createSubjectApi = (data) => axios.post('/v1/api/subjects', data);

export const getAssignmentsApi = (params) => axios.get('/v1/api/assignments', { params });
export const createAssignmentApi = (data) => axios.post('/v1/api/assignments', data);

export const getAttendanceApi = (params) => axios.get('/v1/api/attendance', { params });
export const recordAttendanceApi = (data) => axios.post('/v1/api/attendance', data);

export const getGradesApi = (params) => axios.get('/v1/api/grades', { params });
export const upsertGradeApi = (data) => axios.post('/v1/api/grades', data);

export const getFeesApi = (params) => axios.get('/v1/api/fees', { params });
export const createFeeApi = (data) => axios.post('/v1/api/fees', data);
export const recordPaymentApi = (data) => axios.post('/v1/api/payments', data);

export const getAnnouncementsApi = () => axios.get('/v1/api/announcements');
export const createAnnouncementApi = (data) => axios.post('/v1/api/announcements', data);
export const deleteAnnouncementApi = (id) => axios.delete(`/v1/api/announcements/${id}`);

export const getLeavesApi = (params) => axios.get('/v1/api/leave-requests', { params });
export const createLeaveApi = (data) => axios.post('/v1/api/leave-requests', data);
export const reviewLeaveApi = (id, data) =>
  axios.patch(`/v1/api/leave-requests/${id}/review`, data);

export const getTimetablesApi = (params) => axios.get('/v1/api/timetables', { params });
export const upsertTimetableApi = (data) => axios.post('/v1/api/timetables', data);
export const approveTimetableApi = (id) => axios.patch(`/v1/api/timetables/${id}/approve`);

export const getAuthConfigApi = () => axios.get('/v1/api/auth/config');
export const loginGoogleApi = (credential) =>
  axios.post('/v1/api/auth/google', { credential });

export const getMessagesApi = (params) => axios.get('/v1/api/messages', { params });
export const sendMessageApi = (data) => axios.post('/v1/api/messages', data);
export const markMessageReadApi = (id) => axios.patch(`/v1/api/messages/${id}/read`);

export const getCalendarApi = (params) => axios.get('/v1/api/calendar', { params });
export const createCalendarApi = (data) => axios.post('/v1/api/calendar', data);
export const deleteCalendarApi = (id) => axios.delete(`/v1/api/calendar/${id}`);

export const searchApi = (q) => axios.get('/v1/api/search', { params: { q } });

const apiOrigin = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || '';
    if (
      host.includes('trycloudflare.com') ||
      host.includes('localhost') ||
      host === '127.0.0.1'
    ) {
      return '';
    }
  }
  return import.meta.env.VITE_BACKEND_URL || '';
};

export const downloadExport = async (type) => {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${apiOrigin()}/v1/api/export/${type}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Xuất file thất bại');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
};

export const downloadImportTemplateApi = async (type) => {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${apiOrigin()}/v1/api/import/templates/${type}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Tải mẫu thất bại');
  return res.blob();
};

export const importExcelApi = (type, file) => {
  const fd = new FormData();
  fd.append('file', file);
  return axios.post(`/v1/api/import/${type}`, fd);
};
// Advanced modules
export const getSubscriptionsApi = () => axios.get('/v1/api/subscriptions');
export const upsertSubscriptionApi = (data) => axios.post('/v1/api/subscriptions', data);
export const getSubInvoicesApi = () => axios.get('/v1/api/subscription-invoices');
export const createSubInvoiceApi = (data) => axios.post('/v1/api/subscription-invoices', data);
export const markSubInvoicePaidApi = (id) => axios.patch(`/v1/api/subscription-invoices/${id}/paid`);

export const getExamsApi = (params) => axios.get('/v1/api/exams', { params });
export const getExamApi = (id) => axios.get(`/v1/api/exams/${id}`);
export const createExamApi = (data) => axios.post('/v1/api/exams', data);
export const updateExamApi = (id, data) => axios.put(`/v1/api/exams/${id}`, data);
export const startAttemptApi = (examId) => axios.post(`/v1/api/exams/${examId}/attempts`);
export const submitAttemptApi = (attemptId, answers) =>
  axios.post(`/v1/api/exam-attempts/${attemptId}/submit`, { answers });
export const gradeAttemptApi = (attemptId, grades) =>
  axios.post(`/v1/api/exam-attempts/${attemptId}/grade`, { grades });
export const getAttemptsApi = (params) => axios.get('/v1/api/exam-attempts', { params });

export const getMaterialsApi = (params) => axios.get('/v1/api/materials', { params });
export const createMaterialApi = (data) => axios.post('/v1/api/materials', data);
export const deleteMaterialApi = (id) => axios.delete(`/v1/api/materials/${id}`);

export const getBooksApi = (params) => axios.get('/v1/api/library/books', { params });
export const createBookApi = (data) => axios.post('/v1/api/library/books', data);
export const getLoansApi = (params) => axios.get('/v1/api/library/loans', { params });
export const borrowBookApi = (data) => axios.post('/v1/api/library/loans', data);
export const returnBookApi = (id) => axios.patch(`/v1/api/library/loans/${id}/return`);

export const getFacilitiesApi = (params) => axios.get('/v1/api/facilities', { params });
export const createFacilityApi = (data) => axios.post('/v1/api/facilities', data);
export const reviewFacilityApi = (id, data) => axios.patch(`/v1/api/facilities/${id}/review`, data);

export const getAuditLogsApi = (params) => axios.get('/v1/api/audit-logs', { params });
export const getTicketsApi = (params) => axios.get('/v1/api/support-tickets', { params });
export const createTicketApi = (data) => axios.post('/v1/api/support-tickets', data);
export const updateTicketApi = (id, data) => axios.patch(`/v1/api/support-tickets/${id}`, data);

export const getConductApi = (params) => axios.get('/v1/api/conduct', { params });
export const upsertConductApi = (data) => axios.post('/v1/api/conduct', data);

export const getTemplatesApi = (params) => axios.get('/v1/api/templates', { params });
export const createTemplateApi = (data) => axios.post('/v1/api/templates', data);
export const updateTemplateApi = (id, data) => axios.put(`/v1/api/templates/${id}`, data);
export const applyTemplateApi = (schoolId, templateId) =>
  axios.post(`/v1/api/schools/${schoolId}/apply-template`, { templateId });
