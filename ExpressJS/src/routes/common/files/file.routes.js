const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../../middleware/common/security/rbac.middleware");
const { PERMISSIONS } = require("../../../config/constants/permissions.config");
const audit = require("../../../middleware/common/security/audit.middleware");
const files = require("../../../controllers/common/files/file.controller");
const homework = require("../../../controllers/common/academics/homework.controller");
const upload = require("../../../middleware/common/files/upload.middleware");

const register1 = router => {
  router.post('/materials/upload', authorizePermissionAction('create', PERMISSIONS.MANAGE_MATERIALS), require("../../../middleware/common/files/file-upload.middleware").upload, audit('CREATE', 'FileAsset'), files.upload);
  router.get('/files/usage', authorizeRead('materials'), files.usage);
  router.get('/files/:id', authorizeRead('materials', { personal: true }), files.metadata);
  router.get('/files/:id/download', authorizeRead('materials', { personal: true }), files.download);
  router.get('/materials/:id/downloads', authorizePermissionAction('update', PERMISSIONS.MANAGE_MATERIALS), files.materialDownloads);
};

const register2 = router => {
  router.post('/homeworks/:id/submission-attachments', authorizePermissionAction('create', PERMISSIONS.SUBMIT_ASSIGNMENTS), require("../../../middleware/common/files/file-upload.middleware").upload, audit('UPLOAD', 'HomeworkSubmission'), files.uploadHomeworkAttachment);
  router.get('/homework-submission-files/:id/download', authorizeRead('assignments', { personal: true }), files.downloadHomeworkAttachment);
  router.delete('/homework-submission-files/:id', authorizePermissionAction('create', PERMISSIONS.SUBMIT_ASSIGNMENTS), audit('DELETE', 'HomeworkSubmission'), files.deleteHomeworkAttachment);
};

module.exports = { register1, register2 };
