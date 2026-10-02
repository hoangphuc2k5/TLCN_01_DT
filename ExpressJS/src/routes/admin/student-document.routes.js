const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/security/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/security/audit.middleware");
const studentDocuments = require("../../controllers/admin/student-document.controller");
const upload = require("../../middleware/common/files/upload.middleware");

const register1 = router => {
  router.post('/student-documents/upload', authorizePermissionAction('create', PERMISSIONS.MANAGE_DOCUMENTS), require("../../middleware/common/files/file-upload.middleware").upload, audit('CREATE', 'StudentDocument'), studentDocuments.upload);
  router.get('/student-documents', authorizeRead('student_documents', { personal: true }), studentDocuments.list);
  router.get('/student-documents/:id/download', authorizeRead('student_documents', { personal: true }), studentDocuments.download);
  router.get('/students/:studentId/transcript-history', authorizeRead('student_documents', { personal: true }), studentDocuments.history);
  router.get('/students/:studentId/transcript-history/:snapshotId/:format', authorizeRead('student_documents', { personal: true }), audit('EXPORT', 'StudentTranscriptSnapshot'), studentDocuments.historicalCertificate);
  router.get('/students/:studentId/certificate/:format', authorizeRead('student_documents', { personal: true }), audit('EXPORT', 'StudentTranscript'), studentDocuments.certificate);
};

module.exports = { register1 };
