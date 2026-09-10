import axios from '../util/axios.customize';

export const loginApi = (email, password) =>
  axios.post('/v1/api/auth/login', { email, password });

export const getMeApi = () => axios.get('/v1/api/auth/me');
export const verifyMfaApi = (data) => axios.post('/v1/api/auth/mfa/verify', data);
export const getSecurityApi = () => axios.get('/v1/api/auth/security');
export const securityActionApi = (action, data) => axios.post(`/v1/api/auth/${action}`, data);

export const updateProfileApi = (data) => axios.put('/v1/api/auth/profile', data);

export const getDashboardApi = () => axios.get('/v1/api/dashboard');

export const getNotificationsApi = () => axios.get('/v1/api/notifications');

export const markNotificationReadApi = (id) =>
  axios.patch(`/v1/api/notifications/${id}/read`);
export const deliverNotificationApi = (id, channels = ['SMS', 'ZALO', 'PUSH']) => axios.post(`/v1/api/notifications/${id}/deliver`, { channels });
export const openNotificationStream = async onMessage => {
  const response = await fetch(`${apiOrigin()}/v1/api/notifications/stream`, { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, Accept: 'text/event-stream' } });
  if (!response.ok || !response.body) throw new Error('Notification stream unavailable');
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
  while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const events = buffer.split('\n\n'); buffer = events.pop() || ''; for (const event of events) { const line = event.split('\n').find(item => item.startsWith('data:')); if (line) { try { onMessage(JSON.parse(line.slice(5).trim())); } catch { /* ignore malformed event */ } } } }
  return true;
};

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
export const getFeeDebtorsApi = (params) => axios.get('/v1/api/fees/debtors', { params });
export const runFeeRemindersApi = (data = {}) => axios.post('/v1/api/fees/reminders/run', data);
export const getPayrollApi = (params) => axios.get('/v1/api/payroll', { params });
export const createPayrollApi = (data) => axios.post('/v1/api/payroll', data);
export const updatePayrollStatusApi = (id, status) => axios.patch(`/v1/api/payroll/${id}/status`, { status });
export const getEquipmentApi = (params) => axios.get('/v1/api/equipment', { params });
export const createEquipmentApi = (data) => axios.post('/v1/api/equipment', data);
export const updateEquipmentApi = (id, data) => axios.put(`/v1/api/equipment/${id}`, data);
export const getEquipmentMaintenanceApi = (params) => axios.get('/v1/api/equipment-maintenance', { params });
export const createEquipmentMaintenanceApi = (data) => axios.post('/v1/api/equipment-maintenance', data);
export const updateEquipmentMaintenanceApi = (id, data) => axios.patch(`/v1/api/equipment-maintenance/${id}`, data);
export const createOnlinePaymentApi = (data) => axios.post('/v1/api/online-payments', data);
export const getOnlinePaymentsApi = (params) => axios.get('/v1/api/online-payments', { params });
export const getOnlinePaymentApi = (id) => axios.get(`/v1/api/online-payments/${id}`);
export const getAppointmentsApi = (params) => axios.get('/v1/api/appointments', { params });
export const createAppointmentApi = (data) => axios.post('/v1/api/appointments', data);
export const reviewAppointmentApi = (id, data) => axios.patch(`/v1/api/appointments/${id}/review`, data);
export const cancelAppointmentApi = (id) => axios.patch(`/v1/api/appointments/${id}/cancel`);
export const getSurveysApi = () => axios.get('/v1/api/surveys');
export const submitSurveyApi = (id, data) => axios.post(`/v1/api/appointments/${id}/survey`, data);
export const getRewardsApi = (params) => axios.get('/v1/api/rewards', { params });
export const createRewardApi = (data) => axios.post('/v1/api/rewards', data);
export const reviewRewardApi = (id, data) => axios.patch(`/v1/api/rewards/${id}/review`, data);
export const createAdmissionApi = (data) => axios.post('/v1/api/admissions/public', data);
export const getAdmissionStatusApi = (code) => axios.get(`/v1/api/admissions/public/${encodeURIComponent(code)}`);
export const getAdmissionsApi = (params) => axios.get('/v1/api/admissions', { params });
export const reviewAdmissionApi = (id, data) => axios.patch(`/v1/api/admissions/${id}/review`, data);

export const getAnnouncementsApi = () => axios.get('/v1/api/announcements');
export const createAnnouncementApi = (data) => axios.post('/v1/api/announcements', data);
export const deleteAnnouncementApi = (id) => axios.delete(`/v1/api/announcements/${id}`);

export const cancelMakeupApi = (id, data) => axios.patch(`/v1/api/leave-requests/${id}/cancel-makeup`, data);
export const getLeavesApi = (params) => axios.get('/v1/api/leave-requests', { params });
export const createLeaveApi = (data) => axios.post('/v1/api/leave-requests', data);
export const reviewLeaveApi = (id, data) =>
  axios.patch(`/v1/api/leave-requests/${id}/review`, data);

export const getDatedScheduleApi = (params) => axios.get('/v1/api/timetables/schedule', { params });
export const getTimetablesApi = (params) => axios.get('/v1/api/timetables', { params });
export const upsertTimetableApi = (data) => axios.post('/v1/api/timetables', data);
export const approveTimetableApi = (id) => axios.patch(`/v1/api/timetables/${id}/approve`);

export const getAuthConfigApi = () => axios.get('/v1/api/auth/config');
export const getMonitoringApi = () => axios.get('/v1/api/monitoring');
export const compareSchoolsApi = (schoolIds) => axios.get('/v1/api/reports/schools/compare', { params: { schoolIds: schoolIds.join(',') } });
export const loginGoogleApi = (credential) =>
  axios.post('/v1/api/auth/google', { credential });
export const requestPhoneLoginApi = phone => axios.post('/v1/api/auth/phone/request', { phone });
export const verifyPhoneLoginApi = (challengeId, code) => axios.post('/v1/api/auth/phone/verify', { challengeId, code });
export const loginSsoApi = assertion => axios.post('/v1/api/auth/sso', { assertion });

export const getMessagesApi = (params) => axios.get('/v1/api/messages', { params });
export const sendMessageApi = (data) => axios.post('/v1/api/messages', data);
export const markMessageReadApi = (id) => axios.patch(`/v1/api/messages/${id}/read`);
export const getMessageRealtimeTicketApi = () => axios.post('/v1/api/messages/realtime-ticket');
export const openMessageRealtime = ({ getCursor, onEvent, onStatus }) => {
  let socket; let retryTimer; let stopped = false; let retryMs = 1000;
  const connect = async () => {
    if (stopped) return;
    onStatus?.('CONNECTING');
    try {
      const response = await getMessageRealtimeTicketApi();
      if (response?.EC !== 0 || !response.data?.ticket) throw new Error(response?.EM || 'Không lấy được ticket realtime');
      const base = apiOrigin() || window.location.origin;
      const url = new URL(response.data.path, base);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.searchParams.set('ticket', response.data.ticket);
      const cursor = getCursor?.(); if (cursor) url.searchParams.set('cursor', cursor);
      socket = new WebSocket(url);
      socket.onopen = () => { retryMs = 1000; onStatus?.('CONNECTED'); };
      socket.onmessage = event => { try { onEvent?.(JSON.parse(event.data)); } catch { /* ignore malformed events */ } };
      socket.onerror = () => socket?.close();
      socket.onclose = () => {
        if (stopped) return;
        onStatus?.('RECONNECTING');
        retryTimer = window.setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, 15000);
      };
    } catch {
      if (stopped) return;
      onStatus?.('RECONNECTING');
      retryTimer = window.setTimeout(connect, retryMs);
      retryMs = Math.min(retryMs * 2, 15000);
    }
  };
  connect();
  return () => { stopped = true; window.clearTimeout(retryTimer); socket?.close(); onStatus?.('DISCONNECTED'); };
};

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
export const getHomeworksApi = (params) => axios.get('/v1/api/homeworks', { params });
export const getHomeworkApi = (id) => axios.get(`/v1/api/homeworks/${id}`);
export const createHomeworkApi = (data) => axios.post('/v1/api/homeworks', data);
export const updateHomeworkApi = (id, data) => axios.put(`/v1/api/homeworks/${id}`, data);
export const publishHomeworkApi = (id) => axios.patch(`/v1/api/homeworks/${id}/publish`);
export const closeHomeworkApi = (id) => axios.patch(`/v1/api/homeworks/${id}/close`);
export const getHomeworkSubmissionsApi = (id) => axios.get(`/v1/api/homeworks/${id}/submissions`);
export const submitHomeworkApi = (id, data) => axios.post(`/v1/api/homeworks/${id}/submissions`, data);
export const uploadHomeworkAttachmentApi = (id, file) => { const form = new FormData(); form.append('file', file); return axios.post(`/v1/api/homeworks/${id}/submission-attachments`, form); };
export const deleteHomeworkAttachmentApi = id => axios.delete(`/v1/api/homework-submission-files/${id}`);
export const downloadHomeworkAttachmentApi = (id, name) => downloadPrivateFile(`/homework-submission-files/${id}/download`, name || 'homework-file');
export const gradeHomeworkApi = (id, data) => axios.patch(`/v1/api/assignment-submissions/${id}/grade`, data);
export const getLessonPlansApi = (params) => axios.get('/v1/api/lesson-plans', { params });
export const createLessonPlanApi = data => axios.post('/v1/api/lesson-plans', data);
export const updateLessonPlanApi = (id, data) => axios.put(`/v1/api/lesson-plans/${id}`, data);
export const submitLessonPlanApi = id => axios.patch(`/v1/api/lesson-plans/${id}/submit`);
export const reviewLessonPlanApi = (id, data) => axios.patch(`/v1/api/lesson-plans/${id}/review`, data);
export const deleteLessonPlanApi = id => axios.delete(`/v1/api/lesson-plans/${id}`);
export const getContactBooksApi = (params) => axios.get('/v1/api/contact-books', { params });
export const createContactBookApi = (data) => axios.post('/v1/api/contact-books', data);
export const updateContactBookApi = (id, data) => axios.put(`/v1/api/contact-books/${id}`, data);
export const publishContactBookApi = (id) => axios.patch(`/v1/api/contact-books/${id}/publish`);
export const replyContactBookApi = (id, parentReply) => axios.patch(`/v1/api/contact-books/${id}/reply`, { parentReply });
export const getClassActivitiesApi = (params) => axios.get('/v1/api/class-activities', { params });
export const createClassActivityApi = (data) => axios.post('/v1/api/class-activities', data);
export const publishClassActivityApi = (id) => axios.patch(`/v1/api/class-activities/${id}/publish`);
export const getParentMeetingsApi = () => axios.get('/v1/api/parent-meetings');
export const createParentMeetingApi = (data) => axios.post('/v1/api/parent-meetings', data);
export const cancelParentMeetingApi = (id) => axios.patch(`/v1/api/parent-meetings/${id}/cancel`);
export const rsvpParentMeetingApi = (id, data) => axios.patch(`/v1/api/parent-meetings/${id}/rsvp`, data);
export const getClubsApi = () => axios.get('/v1/api/clubs');
export const createClubApi = (data) => axios.post('/v1/api/clubs', data);
export const registerClubApi = (id) => axios.post(`/v1/api/clubs/${id}/register`);
export const getClubRegistrationsApi = () => axios.get('/v1/api/club-registrations');
export const getRetakeRequestsApi = () => axios.get('/v1/api/retake-requests');
export const createRetakeRequestApi = (data) => axios.post('/v1/api/retake-requests', data);
export const reviewRetakeRequestApi = (id, data) => axios.patch(`/v1/api/retake-requests/${id}/review`, data);
export const getJobsApi = params => axios.get('/v1/api/jobs', { params });
export const retryJobApi = (id, data = {}) => axios.post(`/v1/api/jobs/${id}/retry`, data);
export const cancelJobApi = id => axios.post(`/v1/api/jobs/${id}/cancel`);
export const createMaterialApi = (data) => axios.post('/v1/api/materials', data);
export const deleteMaterialApi = (id) => axios.delete(`/v1/api/materials/${id}`);
export const getFileUsageApi = () => axios.get('/v1/api/files/usage');
export const uploadMaterialApi = (data, file) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(data)) if (value !== undefined && value !== null) form.append(key, String(value));
  form.append('file', file);
  return axios.post('/v1/api/materials/upload', form);
};
export const getStudentDocumentsApi = (params) => axios.get('/v1/api/student-documents', { params });
export const uploadStudentDocumentApi = (data, file) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(data || {})) if (value !== undefined && value !== null) form.append(key, String(value));
  form.append('file', file);
  return axios.post('/v1/api/student-documents/upload', form);
};
const downloadPrivateFile = async (path, fallbackName) => {
  const response = await fetch(`${apiOrigin()}/v1/api${path}`, { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.EM || 'Tai file that bai');
  }
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/i);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a'); link.href = url; link.download = match?.[1] || fallbackName; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
export const downloadStudentDocumentApi = (id, name = 'student-document') => downloadPrivateFile(`/student-documents/${id}/download`, name);
export const downloadCertificateApi = (studentId, format) => downloadPrivateFile(`/students/${studentId}/certificate/${format}`, `student-transcript.${format === 'pdf' ? 'pdf' : 'doc'}`);
export const downloadFileAssetApi = async id => {
  const meta = await axios.get(`/v1/api/files/${id}`);
  if (meta?.EC !== 0) throw new Error(meta?.EM || 'Không tải được thông tin file');
  const response = await fetch(`${apiOrigin()}/v1/api/files/${id}/download`, { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.EM || 'Tải file thất bại');
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = meta.data.originalName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

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

export const verifyVnpayReturnApi = query => axios.get(`/v1/api/online-payments/vnpay/return${query}`);
