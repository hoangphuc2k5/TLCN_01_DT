const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/security/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/security/audit.middleware");
const lessonPlans = require("../../controllers/teacher/lesson-plan.controller");

const register1 = router => {
  router.get('/lesson-plans', authorizeRead('lesson_plans'), lessonPlans.list);
  router.get('/lesson-plans/:id', authorizeRead('lesson_plans'), lessonPlans.get);
  router.post('/lesson-plans', authorizePermissionAction('create', PERMISSIONS.AUTHOR_LESSON_PLANS), audit('CREATE', 'LessonPlan'), lessonPlans.create);
  router.put('/lesson-plans/:id', authorizePermissionAction('update', PERMISSIONS.AUTHOR_LESSON_PLANS), audit('UPDATE', 'LessonPlan'), lessonPlans.update);
  router.patch('/lesson-plans/:id/submit', authorizePermissionAction('update', PERMISSIONS.AUTHOR_LESSON_PLANS), audit('SUBMIT', 'LessonPlan'), lessonPlans.submit);
  router.patch('/lesson-plans/:id/review', authorizePermissionAction('execute', PERMISSIONS.MANAGE_LESSON_PLANS), audit('REVIEW', 'LessonPlan'), lessonPlans.review);
  router.delete('/lesson-plans/:id', authorizePermissionAction('delete', PERMISSIONS.AUTHOR_LESSON_PLANS), audit('DELETE', 'LessonPlan'), lessonPlans.remove);
};

module.exports = { register1 };
