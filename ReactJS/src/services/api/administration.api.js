import axios from '../../config/http-client';

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

export const getMonitoringApi = () => axios.get('/v1/api/monitoring');

export const compareSchoolsApi = (schoolIds, filters = {}) => axios.get('/v1/api/reports/schools/compare', { params: { schoolIds: schoolIds.join(','), ...filters } });

export const exportSchoolComparisonApi = (format, schoolIds, filters = {}) => axios.get(`/v1/api/reports/schools/compare/export.${format}`, { params: { schoolIds: schoolIds.join(','), ...filters }, responseType: 'blob' });

export const getSubscriptionsApi = () => axios.get('/v1/api/subscriptions');

export const upsertSubscriptionApi = (data) => axios.post('/v1/api/subscriptions', data);

export const getSubInvoicesApi = () => axios.get('/v1/api/subscription-invoices');

export const createSubInvoiceApi = (data) => axios.post('/v1/api/subscription-invoices', data);

export const markSubInvoicePaidApi = (id) => axios.patch(`/v1/api/subscription-invoices/${id}/paid`);

export const createClassActivityApi = (data) => axios.post('/v1/api/class-activities', data);

export const getJobsApi = params => axios.get('/v1/api/jobs', { params });

export const retryJobApi = (id, data = {}) => axios.post(`/v1/api/jobs/${id}/retry`, data);

export const cancelJobApi = id => axios.post(`/v1/api/jobs/${id}/cancel`);

export const getAuditLogsApi = (params) => axios.get('/v1/api/audit-logs', { params });

export const getTicketsApi = (params) => axios.get('/v1/api/support-tickets', { params });

export const createTicketApi = (data) => axios.post('/v1/api/support-tickets', data);

export const updateTicketApi = (id, data) => axios.patch(`/v1/api/support-tickets/${id}`, data);

export const getTemplatesApi = (params) => axios.get('/v1/api/templates', { params });

export const createTemplateApi = (data) => axios.post('/v1/api/templates', data);

export const updateTemplateApi = (id, data) => axios.put(`/v1/api/templates/${id}`, data);

export const applyTemplateApi = (schoolId, templateId) =>
  axios.post(`/v1/api/schools/${schoolId}/apply-template`, { templateId });
