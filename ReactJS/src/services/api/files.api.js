import axios from '../../config/http-client';
import { apiOrigin } from './request-utils.js';
import { downloadPrivateFile } from './request-utils.js';

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

export const parseExamQuestionsApi = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return axios.post('/v1/api/import/exams/parse', fd);
};

export const importExamFileApi = (file, meta = {}) => {
  const fd = new FormData();
  fd.append('file', file);
  Object.entries(meta).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, v);
  });
  return axios.post('/v1/api/import/exams', fd);
};

export const getFileUsageApi = () => axios.get('/v1/api/files/usage');

export const getMaterialDownloadsApi = id => axios.get(`/v1/api/materials/${id}/downloads`);

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

export const downloadStudentDocumentApi = (id, name = 'student-document') => downloadPrivateFile(`/student-documents/${id}/download`, name);

export const downloadCertificateApi = (studentId, format) => downloadPrivateFile(`/students/${studentId}/certificate/${format}`, `student-transcript.${format === 'pdf' ? 'pdf' : 'docx'}`);

export const getTranscriptHistoryApi = studentId => axios.get(`/v1/api/students/${studentId}/transcript-history`);

export const downloadTranscriptSnapshotApi = (studentId, snapshotId, version, format) => downloadPrivateFile(
  `/students/${studentId}/transcript-history/${snapshotId}/${format}`,
  `student-transcript-v${version}.${format === 'pdf' ? 'pdf' : 'docx'}`,
);

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

export const fetchFileAssetBlobApi = async id => {
  const meta = await axios.get(`/v1/api/files/${id}`);
  if (meta?.EC !== 0) throw new Error(meta?.EM || 'Không tải được thông tin file');
  const response = await fetch(`${apiOrigin()}/v1/api/files/${id}/download`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.EM || 'Tải dữ liệu tệp thất bại');
  }
  const originalName = meta.data?.originalName || 'file';
  let mimeType = meta.data?.mimeType;
  if (!mimeType || mimeType === 'application/octet-stream') {
    const lower = originalName.toLowerCase();
    if (lower.endsWith('.pdf')) mimeType = 'application/pdf';
    else if (lower.endsWith('.png')) mimeType = 'image/png';
    else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mimeType = 'image/jpeg';
    else if (lower.endsWith('.webp')) mimeType = 'image/webp';
    else if (lower.endsWith('.svg')) mimeType = 'image/svg+xml';
    else if (lower.endsWith('.txt')) mimeType = 'text/plain';
    else if (lower.endsWith('.json')) mimeType = 'application/json';
  }
  const rawBlob = await response.blob();
  const blob = mimeType ? new Blob([rawBlob], { type: mimeType }) : rawBlob;
  const url = URL.createObjectURL(blob);
  return {
    url,
    meta: meta.data,
    fileName: originalName,
    mimeType: mimeType || rawBlob.type,
    sizeBytes: meta.data?.sizeBytes || rawBlob.size,
  };
};

export const fetchStudentDocumentBlobApi = async (id, fallbackName = 'document') => {
  const response = await fetch(`${apiOrigin()}/v1/api/student-documents/${id}/download`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.EM || 'Tải dữ liệu hồ sơ thất bại');
  }
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/i);
  const fileName = match?.[1] || fallbackName;
  let mimeType = '';
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) mimeType = 'application/pdf';
  else if (lower.endsWith('.png')) mimeType = 'image/png';
  else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mimeType = 'image/jpeg';
  else if (lower.endsWith('.webp')) mimeType = 'image/webp';
  else if (lower.endsWith('.svg')) mimeType = 'image/svg+xml';
  else if (lower.endsWith('.txt')) mimeType = 'text/plain';
  else if (lower.endsWith('.json')) mimeType = 'application/json';

  const rawBlob = await response.blob();
  const blob = mimeType ? new Blob([rawBlob], { type: mimeType }) : rawBlob;
  const url = URL.createObjectURL(blob);
  return {
    url,
    fileName,
    mimeType: mimeType || rawBlob.type,
    sizeBytes: rawBlob.size,
  };
};
