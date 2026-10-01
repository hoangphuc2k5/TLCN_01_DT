const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const controller = require('../../controllers/administration/academic.controller');

const register1 = router => {
  router.get('/academic-years', controller.listAcademicYears);
  router.post('/academic-years', authorizePermissionAction('create', PERMISSIONS.MANAGE_STRUCTURE), controller.createAcademicYear);
  router.get('/classes', controller.listClasses);
  router.post('/classes', authorizePermissionAction('create', PERMISSIONS.MANAGE_STRUCTURE), controller.createClass);
  router.put('/classes/:id', authorizePermissionAction('update', PERMISSIONS.MANAGE_STRUCTURE), controller.updateClass);
  router.delete('/classes/:id', authorizePermissionAction('delete', PERMISSIONS.MANAGE_STRUCTURE), controller.deleteClass);
  router.get('/classes/:id/students', controller.listStudentsInClass);
  router.get('/subjects', controller.listSubjects);
  router.post('/subjects', authorizePermissionAction('create', PERMISSIONS.MANAGE_STRUCTURE), controller.createSubject);
  router.put('/subjects/:id', authorizePermissionAction('update', PERMISSIONS.MANAGE_STRUCTURE), controller.updateSubject);
  router.get('/assignments', controller.listAssignments);
  router.post('/assignments', authorizePermissionAction('create', PERMISSIONS.MANAGE_STRUCTURE), controller.createAssignment);
  router.delete('/assignments/:id', authorizePermissionAction('delete', PERMISSIONS.MANAGE_STRUCTURE), controller.deleteAssignment);
};

module.exports = { register1 };
