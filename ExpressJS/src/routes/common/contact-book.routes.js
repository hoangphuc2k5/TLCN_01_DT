const { authorizeRoles, authorizePermissionAction, authorizeRead } = require("../../middleware/common/rbac.middleware");
const { PERMISSIONS } = require("../../config/constants/permissions.config");
const audit = require("../../middleware/common/audit.middleware");
const contactBooks = require("../../controllers/common/contact-book.controller");

const register1 = router => {
  router.get('/contact-books', authorizeRead('contact_books', { personal: true }), contactBooks.list);
  router.get('/contact-books/:id', authorizeRead('contact_books', { personal: true }), contactBooks.get);
  router.post('/contact-books', authorizePermissionAction('create', PERMISSIONS.MANAGE_CONTACT_BOOKS), audit('CREATE', 'ContactBookEntry'), contactBooks.create);
  router.put('/contact-books/:id', authorizePermissionAction('update', PERMISSIONS.MANAGE_CONTACT_BOOKS), audit('UPDATE', 'ContactBookEntry'), contactBooks.update);
  router.patch('/contact-books/:id/publish', authorizePermissionAction('execute', PERMISSIONS.MANAGE_CONTACT_BOOKS), audit('PUBLISH', 'ContactBookEntry'), contactBooks.publish);
  router.patch('/contact-books/:id/reply', authorizeRead('contact_books', { personal: true }), audit('REPLY', 'ContactBookEntry'), contactBooks.reply);
};

module.exports = { register1 };
