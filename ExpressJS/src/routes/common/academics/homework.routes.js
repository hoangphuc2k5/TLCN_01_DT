const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../../middleware/common/security/rbac.middleware");
const { PERMISSIONS } = require("../../../config/constants/permissions.config");
const audit = require("../../../middleware/common/security/audit.middleware");
const homework = require("../../../controllers/common/academics/homework.controller");

const register1 = router => {
  router.get('/homeworks', authorizeRead('assignments', { personal: true }), homework.list);
  router.get('/homeworks/:id', authorizeRead('assignments', { personal: true }), homework.get);
  router.get('/homeworks/:id/submissions', authorizeRead('assignments', { personal: true }), homework.submissions);
  router.post('/homeworks', authorizePermissionAction('create', PERMISSIONS.MANAGE_ASSIGNMENTS), audit('CREATE', 'Homework'), homework.create);
  router.put('/homeworks/:id', authorizePermissionAction('update', PERMISSIONS.MANAGE_ASSIGNMENTS), audit('UPDATE', 'Homework'), homework.update);
  router.patch('/homeworks/:id/publish', authorizePermissionAction('execute', PERMISSIONS.MANAGE_ASSIGNMENTS), audit('PUBLISH', 'Homework'), homework.publish);
  router.patch('/homeworks/:id/close', authorizePermissionAction('execute', PERMISSIONS.MANAGE_ASSIGNMENTS), audit('CLOSE', 'Homework'), homework.close);
  router.post('/homeworks/:id/submissions', authorizePermissionAction('create', PERMISSIONS.SUBMIT_ASSIGNMENTS), audit('SUBMIT', 'HomeworkSubmission'), homework.submit);
};

const register2 = router => {
  router.patch('/assignment-submissions/:submissionId/grade', authorizePermissionAction('update', PERMISSIONS.MANAGE_ASSIGNMENTS), audit('GRADE', 'HomeworkSubmission'), homework.grade);
};

module.exports = { register1, register2 };
