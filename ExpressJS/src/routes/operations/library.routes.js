const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/security/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/security/audit.middleware");
const controller = require('../../controllers/operations/library.controller');

const register1 = router => {
  router.get('/library/books', authorizeRead('library', { personal: true }), controller.listBooks);
  router.post('/library/books', authorizePermissionAction('create', PERMISSIONS.MANAGE_LIBRARY), audit('CREATE', 'LibraryBook'), controller.createBook);
  router.put('/library/books/:id', authorizePermissionAction('update', PERMISSIONS.MANAGE_LIBRARY), controller.updateBook);
  router.get('/library/loans', authorizeRead('library', { personal: true }), controller.listLoans);
  router.post('/library/loans', authorizePermissionAction('create', PERMISSIONS.MANAGE_LIBRARY), audit('CREATE', 'BookLoan'), controller.borrowBook);
  router.patch('/library/loans/:id/return', authorizePermissionAction('execute', PERMISSIONS.MANAGE_LIBRARY), controller.returnBook);
};

module.exports = { register1 };
