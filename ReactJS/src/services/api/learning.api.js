import axios from '../../config/http-client';
import { downloadPrivateFile } from './request-utils.js';

export const getAssignmentsApi = (params) => axios.get('/v1/api/assignments', { params });

export const createAssignmentApi = (data) => axios.post('/v1/api/assignments', data);

export const getAttendanceApi = (params) => axios.get('/v1/api/attendance', { params });

export const recordAttendanceApi = (data) => axios.post('/v1/api/attendance', data);

export const getGradesApi = (params) => axios.get('/v1/api/grades', { params });

export const upsertGradeApi = (data) => axios.post('/v1/api/grades', data);

export const getExamsApi = (params) => axios.get('/v1/api/exams', { params });

export const getExamApi = (id) => axios.get(`/v1/api/exams/${id}`);

export const createExamApi = (data) => axios.post('/v1/api/exams', data);

export const updateExamApi = (id, data) => axios.put(`/v1/api/exams/${id}`, data);

export const startAttemptApi = (examId) => axios.post(`/v1/api/exams/${examId}/attempts`);

export const submitAttemptApi = (attemptId, answers) =>
    axios.post(`/v1/api/exam-attempts/${attemptId}/submit`, { answers });

export const saveAttemptDraftApi = (attemptId, answers) =>
    axios.patch(`/v1/api/exam-attempts/${attemptId}/draft`, { answers });

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

export const getRetakeRequestsApi = () => axios.get('/v1/api/retake-requests');

export const createRetakeRequestApi = (data) => axios.post('/v1/api/retake-requests', data);

export const reviewRetakeRequestApi = (id, data) => axios.patch(`/v1/api/retake-requests/${id}/review`, data);

export const createMaterialApi = (data) => axios.post('/v1/api/materials', data);

export const deleteMaterialApi = (id) => axios.delete(`/v1/api/materials/${id}`);
