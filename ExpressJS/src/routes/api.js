const express = require('express');
const validate = require('../middleware/validate');
const { authorizeRoles, authorizePermission } = require('../middleware/rbac');
const { PERMISSIONS } = require('../constants/permissions');
const { ROLES } = require('../constants/roles');
const audit = require('../middleware/audit');
const authController = require('../controllers/authController');
const c = require('../controllers/moduleController');
const a = require('../controllers/advancedController');

const router = express.Router();

router.get('/health', (req, res) => res.json({ EC: 0, EM: 'OK', data: { status: 'up' } }));

// Auth
router.post('/auth/login', authController.loginValidators, validate, authController.login);
router.post('/auth/google', authController.loginGoogle);
router.get('/auth/config', authController.authConfig);
router.get('/auth/me', authController.me);
router.put('/auth/profile', authController.updateProfile);

// Dashboard & notifications
router.get('/dashboard', c.getDashboard);
router.get('/notifications', c.listNotifications);
router.patch('/notifications/read-all', c.markAllRead);
router.patch('/notifications/:id/read', c.markRead);

// Clusters
router.get('/clusters', authorizePermission(PERMISSIONS.MANAGE_CLUSTERS, PERMISSIONS.MANAGE_TENANTS), c.listClusters);
router.post('/clusters', authorizeRoles(ROLES.SUPER_ADMIN), audit('CREATE', 'Cluster'), c.createCluster);
router.put('/clusters/:id', authorizeRoles(ROLES.SUPER_ADMIN), audit('UPDATE', 'Cluster'), c.updateCluster);
router.delete('/clusters/:id', authorizeRoles(ROLES.SUPER_ADMIN), audit('DELETE', 'Cluster'), c.deleteCluster);

// Schools
router.get('/schools', c.listSchools);
router.post('/schools', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.CLUSTER_ADMIN), audit('CREATE', 'School'), c.createSchool);
router.put('/schools/:id', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.CLUSTER_ADMIN, ROLES.SCHOOL_ADMIN), audit('UPDATE', 'School'), c.updateSchool);
router.delete('/schools/:id', authorizeRoles(ROLES.SUPER_ADMIN), audit('DELETE', 'School'), c.deleteSchool);

// Users
router.get('/users', authorizePermission(PERMISSIONS.MANAGE_USERS), c.listUsers);
router.get('/users/directory', (req, _res, next) => {
  req.query.scope = 'directory';
  next();
}, c.listUsers); // danh bạ gửi tin (scope theo tenant, không lọc hierarchy)
router.post('/users', authorizePermission(PERMISSIONS.MANAGE_USERS), audit('CREATE', 'User'), c.createUser);
router.put('/users/:id', authorizePermission(PERMISSIONS.MANAGE_USERS), audit('UPDATE', 'User'), c.updateUser);
router.post(
  '/users/:id/reset-password',
  authorizePermission(PERMISSIONS.MANAGE_USERS),
  audit('RESET_PASSWORD', 'User'),
  c.resetUserPassword
);
router.delete('/users/:id', authorizePermission(PERMISSIONS.MANAGE_USERS), audit('DELETE', 'User'), c.deleteUser);

// Roles (dynamic RBAC)
const roleController = require('../controllers/roleController');
router.get('/roles/permission-catalog', authorizePermission(PERMISSIONS.MANAGE_ROLES), roleController.permissionCatalog);
router.get('/roles/assignable', authorizePermission(PERMISSIONS.MANAGE_USERS, PERMISSIONS.MANAGE_ROLES), roleController.listAssignable);
router.get('/roles', authorizePermission(PERMISSIONS.MANAGE_ROLES), roleController.listRoles);
router.post('/roles', authorizePermission(PERMISSIONS.MANAGE_ROLES), audit('CREATE', 'Role'), roleController.createRole);
router.put('/roles/:id', authorizePermission(PERMISSIONS.MANAGE_ROLES), audit('UPDATE', 'Role'), roleController.updateRole);
router.delete('/roles/:id', authorizePermission(PERMISSIONS.MANAGE_ROLES), audit('DELETE', 'Role'), roleController.deleteRole);

// Academic structure
router.get('/academic-years', c.listAcademicYears);
router.post('/academic-years', authorizePermission(PERMISSIONS.MANAGE_STRUCTURE), c.createAcademicYear);
router.get('/classes', c.listClasses);
router.post('/classes', authorizePermission(PERMISSIONS.MANAGE_STRUCTURE), c.createClass);
router.put('/classes/:id', authorizePermission(PERMISSIONS.MANAGE_STRUCTURE), c.updateClass);
router.delete('/classes/:id', authorizePermission(PERMISSIONS.MANAGE_STRUCTURE), c.deleteClass);
router.get('/classes/:id/students', c.listStudentsInClass);
router.get('/subjects', c.listSubjects);
router.post('/subjects', authorizePermission(PERMISSIONS.MANAGE_STRUCTURE), c.createSubject);
router.put('/subjects/:id', authorizePermission(PERMISSIONS.MANAGE_STRUCTURE), c.updateSubject);
router.get('/assignments', c.listAssignments);
router.post('/assignments', authorizePermission(PERMISSIONS.MANAGE_STRUCTURE), c.createAssignment);
router.delete('/assignments/:id', authorizePermission(PERMISSIONS.MANAGE_STRUCTURE), c.deleteAssignment);

// Attendance
router.get('/attendance', c.listAttendance);
router.post('/attendance', authorizePermission(PERMISSIONS.TAKE_ATTENDANCE), audit('CREATE', 'Attendance'), c.recordAttendance);

// Grades
router.get('/grades', c.listGrades);
router.post('/grades', authorizePermission(PERMISSIONS.ENTER_GRADES), audit('UPSERT', 'Grade'), c.upsertGrade);
router.post('/grades/:id/scores', authorizePermission(PERMISSIONS.ENTER_GRADES), c.addScore);

// Fees
router.get('/fees', c.listInvoices);
router.post('/fees', authorizePermission(PERMISSIONS.MANAGE_FEES), audit('CREATE', 'FeeInvoice'), c.createInvoice);
router.get('/payments', authorizePermission(PERMISSIONS.MANAGE_FEES), c.listPayments);
router.post('/payments', authorizePermission(PERMISSIONS.MANAGE_FEES), audit('CREATE', 'Payment'), c.recordPayment);

// Announcements
router.get('/announcements', c.listAnnouncements);
router.post('/announcements', authorizePermission(PERMISSIONS.MANAGE_ANNOUNCEMENTS), audit('CREATE', 'Announcement'), c.createAnnouncement);
router.delete('/announcements/:id', authorizePermission(PERMISSIONS.MANAGE_ANNOUNCEMENTS), c.deleteAnnouncement);

// Leave
router.get('/leave-requests', c.listLeaves);
router.post('/leave-requests', authorizePermission(PERMISSIONS.MANAGE_LEAVE), c.createLeave);
router.patch('/leave-requests/:id/review', authorizeRoles(ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS, ROLES.HOMEROOM_TEACHER, ROLES.CLUSTER_ADMIN), audit('REVIEW', 'LeaveRequest'), c.reviewLeave);

// Timetable
router.get('/timetables', c.listTimetables);
router.post('/timetables', authorizePermission(PERMISSIONS.MANAGE_TIMETABLE), audit('UPSERT', 'Timetable'), c.upsertTimetable);
router.patch('/timetables/:id/approve', authorizeRoles(ROLES.SCHOOL_ADMIN), c.approveTimetable);

// Subscriptions
router.get('/subscriptions', authorizePermission(PERMISSIONS.MANAGE_SUBSCRIPTIONS, PERMISSIONS.VIEW_REPORTS), a.listSubscriptions);
router.post('/subscriptions', authorizePermission(PERMISSIONS.MANAGE_SUBSCRIPTIONS), audit('UPSERT', 'Subscription'), a.upsertSubscription);
router.get('/subscription-invoices', authorizePermission(PERMISSIONS.MANAGE_SUBSCRIPTIONS), a.listSubInvoices);
router.post('/subscription-invoices', authorizePermission(PERMISSIONS.MANAGE_SUBSCRIPTIONS), audit('CREATE', 'SubscriptionInvoice'), a.createSubInvoice);
router.patch('/subscription-invoices/:id/paid', authorizePermission(PERMISSIONS.MANAGE_SUBSCRIPTIONS), a.markSubInvoicePaid);

// Exams
router.get('/exams', a.listExams);
router.get('/exams/:id', a.getExam);
router.post('/exams', authorizePermission(PERMISSIONS.MANAGE_EXAMS), audit('CREATE', 'Exam'), a.createExam);
router.put('/exams/:id', authorizePermission(PERMISSIONS.MANAGE_EXAMS), audit('UPDATE', 'Exam'), a.updateExam);
router.post('/exams/:id/attempts', authorizePermission(PERMISSIONS.TAKE_EXAMS), a.startAttempt);
router.post('/exam-attempts/:attemptId/submit', authorizePermission(PERMISSIONS.TAKE_EXAMS), a.submitAttempt);
router.post('/exam-attempts/:attemptId/grade', authorizePermission(PERMISSIONS.MANAGE_EXAMS), a.gradeAttempt);
router.get('/exam-attempts', a.listAttempts);

// Materials
router.get('/materials', a.listMaterials);
router.post('/materials', authorizePermission(PERMISSIONS.MANAGE_MATERIALS), audit('CREATE', 'LearningMaterial'), a.createMaterial);
router.delete('/materials/:id', authorizePermission(PERMISSIONS.MANAGE_MATERIALS), a.deleteMaterial);

// Library
router.get('/library/books', a.listBooks);
router.post('/library/books', authorizePermission(PERMISSIONS.MANAGE_LIBRARY), audit('CREATE', 'LibraryBook'), a.createBook);
router.put('/library/books/:id', authorizePermission(PERMISSIONS.MANAGE_LIBRARY), a.updateBook);
router.get('/library/loans', a.listLoans);
router.post('/library/loans', authorizePermission(PERMISSIONS.MANAGE_LIBRARY), audit('CREATE', 'BookLoan'), a.borrowBook);
router.patch('/library/loans/:id/return', authorizePermission(PERMISSIONS.MANAGE_LIBRARY), a.returnBook);

// Facilities
router.get('/facilities', a.listFacilities);
router.post('/facilities', authorizePermission(PERMISSIONS.MANAGE_FACILITIES), audit('CREATE', 'FacilityRequest'), a.createFacility);
router.patch('/facilities/:id/review', authorizeRoles(ROLES.LIBRARIAN, ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS), audit('REVIEW', 'FacilityRequest'), a.reviewFacility);

// Audit / Support / Conduct / Templates
router.get('/audit-logs', authorizePermission(PERMISSIONS.VIEW_AUDIT), a.listAuditLogs);
router.get('/support-tickets', authorizePermission(PERMISSIONS.MANAGE_SUPPORT), a.listTickets);
router.post('/support-tickets', authorizePermission(PERMISSIONS.MANAGE_SUPPORT), audit('CREATE', 'SupportTicket'), a.createTicket);
router.patch('/support-tickets/:id', authorizePermission(PERMISSIONS.MANAGE_SUPPORT), a.updateTicket);
router.get('/conduct', a.listConduct);
router.post('/conduct', authorizePermission(PERMISSIONS.MANAGE_CONDUCT), audit('UPSERT', 'ConductRecord'), a.upsertConduct);
router.get('/templates', a.listTemplates);
router.post('/templates', authorizePermission(PERMISSIONS.MANAGE_TEMPLATES), audit('CREATE', 'SharedTemplate'), a.createTemplate);
router.put('/templates/:id', authorizePermission(PERMISSIONS.MANAGE_TEMPLATES), a.updateTemplate);
router.post('/schools/:schoolId/apply-template', authorizePermission(PERMISSIONS.MANAGE_TEMPLATES), a.applyTemplate);

// Cross-role: messaging, calendar, search, export
const x = require('../controllers/crossController');
router.get('/messages', x.listMessages);
router.post('/messages', audit('CREATE', 'Message'), x.sendMessage);
router.patch('/messages/:id/read', x.markMessageRead);
router.get('/calendar', x.listEvents);
router.post('/calendar', audit('CREATE', 'CalendarEvent'), x.createEvent);
router.delete('/calendar/:id', x.deleteEvent);
router.get('/search', x.search);
router.get('/export/grades', x.exportGrades);
router.get('/export/fees', x.exportFees);
router.get('/export/attendance', x.exportAttendance);

// Import Excel
const upload = require('../middleware/upload');
const imp = require('../controllers/importController');
router.get('/import/templates/:type', imp.downloadTemplate);
router.post(
  '/import/users',
  authorizePermission(PERMISSIONS.MANAGE_USERS),
  upload.single('file'),
  audit('IMPORT', 'User'),
  imp.importUsers
);
router.post(
  '/import/grades',
  authorizePermission(PERMISSIONS.ENTER_GRADES),
  upload.single('file'),
  audit('IMPORT', 'Grade'),
  imp.importGrades
);
router.post(
  '/import/fees',
  authorizePermission(PERMISSIONS.MANAGE_FEES),
  upload.single('file'),
  audit('IMPORT', 'FeeInvoice'),
  imp.importFees
);
router.post(
  '/import/attendance',
  authorizePermission(PERMISSIONS.TAKE_ATTENDANCE),
  upload.single('file'),
  audit('IMPORT', 'Attendance'),
  imp.importAttendance
);

module.exports = router;
