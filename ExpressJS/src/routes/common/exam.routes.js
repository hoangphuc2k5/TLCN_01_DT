const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/audit.middleware");
const controller = require('../../controllers/common/exam.controller');

const register1 = router => {
  router.get('/exams', authorizeRead('exams', { personal: true }), controller.listExams);
  router.get('/exams/:id', authorizeRead('exams', { personal: true }), controller.getExam);
  router.post('/exams', authorizePermissionAction('create', PERMISSIONS.MANAGE_EXAMS), audit('CREATE', 'Exam'), controller.createExam);
  router.put('/exams/:id', authorizePermissionAction('update', PERMISSIONS.MANAGE_EXAMS), audit('UPDATE', 'Exam'), controller.updateExam);
  router.post('/exams/:id/attempts', authorizePermissionAction('execute', PERMISSIONS.TAKE_EXAMS), controller.startAttempt);
  router.post('/exam-attempts/:attemptId/submit', authorizePermissionAction('execute', PERMISSIONS.TAKE_EXAMS), controller.submitAttempt);
  router.patch('/exam-attempts/:attemptId/draft', authorizePermissionAction('execute', PERMISSIONS.TAKE_EXAMS), controller.saveAttemptDraft);
  router.post('/exam-attempts/:attemptId/grade', authorizePermissionAction('update', PERMISSIONS.MANAGE_EXAMS), controller.gradeAttempt);
  router.get('/exam-attempts', authorizeRead('exams', { personal: true }), controller.listAttempts);
};

module.exports = { register1 };
