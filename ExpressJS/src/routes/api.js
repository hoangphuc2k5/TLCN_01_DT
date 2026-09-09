const express = require('express');
const validate = require('../middleware/validate');
const { authorizeRoles, authorizePermissionAction, authorizeRead } = require('../middleware/rbac');
const { PERMISSIONS } = require('../constants/permissions');
const { ROLES } = require('../constants/roles');
const audit = require('../middleware/audit');
const authController = require('../controllers/authController');
const c = require('../controllers/moduleController');
const a = require('../controllers/advancedController');

const router = express.Router();
const onlinePayments = require('../controllers/onlinePaymentController');
const appointments = require('../controllers/appointmentController');
const rewards = require('../controllers/rewardController');
const admissions = require('../controllers/admissionController');
const jobs = require('../controllers/jobController');
const studentDocuments = require('../controllers/studentDocumentController');
router.get('/jobs', authorizeRead('jobs'), jobs.list);
router.post('/jobs/:id/retry', authorizePermissionAction('execute', PERMISSIONS.MANAGE_JOBS), audit('RETRY', 'Job'), jobs.retry);
router.post('/jobs/:id/cancel', authorizePermissionAction('execute', PERMISSIONS.MANAGE_JOBS), audit('CANCEL', 'Job'), jobs.cancel);
const files = require('../controllers/fileController');
router.post('/materials/upload', authorizePermissionAction('create', PERMISSIONS.MANAGE_MATERIALS), require('../middleware/fileUpload').upload, audit('CREATE', 'FileAsset'), files.upload);
router.get('/files/usage', authorizeRead('materials'), files.usage);
router.get('/files/:id', authorizeRead('materials', { personal: true }), files.metadata);
router.get('/files/:id/download', authorizeRead('materials', { personal: true }), files.download);
router.post('/student-documents/upload', authorizePermissionAction('create', PERMISSIONS.MANAGE_DOCUMENTS), require('../middleware/fileUpload').upload, audit('CREATE', 'StudentDocument'), studentDocuments.upload);
router.get('/student-documents', authorizeRead('student_documents', { personal: true }), studentDocuments.list);
router.get('/student-documents/:id/download', authorizeRead('student_documents', { personal: true }), studentDocuments.download);
router.get('/students/:studentId/certificate/:format', authorizeRead('student_documents', { personal: true }), studentDocuments.certificate);

router.get('/health', (req, res) => res.json({ EC: 0, EM: 'OK', data: { status: 'up' } }));

// Auth
const authSecurity = require('../controllers/authSecurityController');
router.use('/auth', authSecurity.noStore);
router.post(['/auth/login', '/auth/google', '/auth/mfa/verify', '/auth/mfa/setup', '/auth/mfa/confirm', '/auth/mfa/disable', '/auth/mfa/recovery', '/auth/password'], authSecurity.limit);
router.post('/auth/login', authController.loginValidators, validate, authController.login);
router.post('/auth/google', authController.loginGoogle);
router.get('/auth/config', authController.authConfig);
router.get('/auth/me', authController.me);
router.put('/auth/profile', authController.updateProfile);
router.get('/auth/security', authSecurity.status);
router.post('/auth/mfa/verify', authSecurity.verify);
router.post('/auth/mfa/setup', audit('MFA_SETUP', 'User'), authSecurity.setup);
router.post('/auth/mfa/confirm', audit('MFA_ENABLE', 'User'), authSecurity.confirm);
router.post('/auth/mfa/disable', audit('MFA_DISABLE', 'User'), authSecurity.disable);
router.post('/auth/mfa/recovery', audit('MFA_RECOVERY_ROTATE', 'User'), authSecurity.recovery);
router.post('/auth/password', audit('CHANGE_PASSWORD', 'User'), authSecurity.password);

// Dashboard & notifications
router.get('/dashboard', c.getDashboard);
router.get('/notifications', c.listNotifications);
router.patch('/notifications/read-all', c.markAllRead);
router.patch('/notifications/:id/read', c.markRead);

// Clusters
router.get('/clusters', authorizePermissionAction('view', PERMISSIONS.MANAGE_CLUSTERS, PERMISSIONS.MANAGE_TENANTS), c.listClusters);
router.post('/clusters', authorizeRoles(ROLES.SUPER_ADMIN), audit('CREATE', 'Cluster'), c.createCluster);
router.put('/clusters/:id', authorizeRoles(ROLES.SUPER_ADMIN), audit('UPDATE', 'Cluster'), c.updateCluster);
router.delete('/clusters/:id', authorizeRoles(ROLES.SUPER_ADMIN), audit('DELETE', 'Cluster'), c.deleteCluster);

// Schools
router.get('/schools', c.listSchools);
router.post('/schools', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.CLUSTER_ADMIN), audit('CREATE', 'School'), c.createSchool);
router.put('/schools/:id', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.CLUSTER_ADMIN, ROLES.SCHOOL_ADMIN), audit('UPDATE', 'School'), c.updateSchool);
router.delete('/schools/:id', authorizeRoles(ROLES.SUPER_ADMIN), audit('DELETE', 'School'), c.deleteSchool);

// Users
router.get('/users', authorizePermissionAction('view', PERMISSIONS.MANAGE_USERS), c.listUsers);
router.get('/users/directory', (req, _res, next) => {
  req.query.scope = 'directory';
  next();
}, c.listUsers); // danh bạ gửi tin (scope theo tenant, không lọc hierarchy)
router.post('/users', authorizePermissionAction('create', PERMISSIONS.MANAGE_USERS), audit('CREATE', 'User'), c.createUser);
router.put('/users/:id', authorizePermissionAction('update', PERMISSIONS.MANAGE_USERS), audit('UPDATE', 'User'), c.updateUser);
router.post(
  '/users/:id/reset-password',
  authorizePermissionAction('update', PERMISSIONS.MANAGE_USERS),
  audit('RESET_PASSWORD', 'User'),
  c.resetUserPassword
);
router.delete('/users/:id', authorizePermissionAction('delete', PERMISSIONS.MANAGE_USERS), audit('DELETE', 'User'), c.deleteUser);

// Roles (dynamic RBAC)
const roleController = require('../controllers/roleController');
router.get('/roles/permission-catalog', authorizePermissionAction('view', PERMISSIONS.MANAGE_ROLES), roleController.permissionCatalog);
router.get('/roles/assignable', authorizePermissionAction('view', PERMISSIONS.MANAGE_USERS, PERMISSIONS.MANAGE_ROLES), roleController.listAssignable);
router.get('/roles', authorizePermissionAction('view', PERMISSIONS.MANAGE_ROLES), roleController.listRoles);
router.post('/roles', authorizePermissionAction('create', PERMISSIONS.MANAGE_ROLES), audit('CREATE', 'Role'), roleController.createRole);
router.put('/roles/:id', authorizePermissionAction('update', PERMISSIONS.MANAGE_ROLES), audit('UPDATE', 'Role'), roleController.updateRole);
router.delete('/roles/:id', authorizePermissionAction('delete', PERMISSIONS.MANAGE_ROLES), audit('DELETE', 'Role'), roleController.deleteRole);

// Academic structure
router.get('/academic-years', c.listAcademicYears);
router.post('/academic-years', authorizePermissionAction('create', PERMISSIONS.MANAGE_STRUCTURE), c.createAcademicYear);
router.get('/classes', c.listClasses);
router.post('/classes', authorizePermissionAction('create', PERMISSIONS.MANAGE_STRUCTURE), c.createClass);
router.put('/classes/:id', authorizePermissionAction('update', PERMISSIONS.MANAGE_STRUCTURE), c.updateClass);
router.delete('/classes/:id', authorizePermissionAction('delete', PERMISSIONS.MANAGE_STRUCTURE), c.deleteClass);
router.get('/classes/:id/students', c.listStudentsInClass);
router.get('/subjects', c.listSubjects);
router.post('/subjects', authorizePermissionAction('create', PERMISSIONS.MANAGE_STRUCTURE), c.createSubject);
router.put('/subjects/:id', authorizePermissionAction('update', PERMISSIONS.MANAGE_STRUCTURE), c.updateSubject);
router.get('/assignments', c.listAssignments);
router.post('/assignments', authorizePermissionAction('create', PERMISSIONS.MANAGE_STRUCTURE), c.createAssignment);
router.delete('/assignments/:id', authorizePermissionAction('delete', PERMISSIONS.MANAGE_STRUCTURE), c.deleteAssignment);

// Attendance
router.get('/attendance', c.listAttendance);
router.post('/attendance', authorizePermissionAction(['create', 'update'], PERMISSIONS.TAKE_ATTENDANCE), audit('CREATE', 'Attendance'), c.recordAttendance);

// Grades
router.get('/grades', c.listGrades);
router.post('/grades', authorizePermissionAction(['create', 'update'], PERMISSIONS.ENTER_GRADES), audit('UPSERT', 'Grade'), c.upsertGrade);
router.post('/grades/:id/scores', authorizePermissionAction('update', PERMISSIONS.ENTER_GRADES), c.addScore);

// Fees
router.get('/fees', c.listInvoices);
router.post('/fees', authorizePermissionAction('create', PERMISSIONS.MANAGE_FEES), audit('CREATE', 'FeeInvoice'), c.createInvoice);
router.get('/payments', authorizePermissionAction('view', PERMISSIONS.MANAGE_FEES), c.listPayments);
router.post('/payments', authorizePermissionAction('create', PERMISSIONS.MANAGE_FEES), audit('CREATE', 'Payment'), c.recordPayment);
// Gateway callbacks are authenticated by an HMAC signature in the provider adapter.
router.post('/online-payments/webhook/:provider', onlinePayments.webhook);
router.post('/online-payments', authorizePermissionAction('create', PERMISSIONS.PAY_ONLINE), onlinePayments.create);
router.get('/online-payments', authorizePermissionAction('view', PERMISSIONS.PAY_ONLINE, PERMISSIONS.MANAGE_FEES), onlinePayments.list);
router.get('/online-payments/:id', authorizePermissionAction('view', PERMISSIONS.PAY_ONLINE, PERMISSIONS.MANAGE_FEES), onlinePayments.get);

// Teacher appointments and parent satisfaction surveys
router.get('/appointments', authorizePermissionAction('view', PERMISSIONS.MANAGE_APPOINTMENTS, PERMISSIONS.REQUEST_APPOINTMENTS), appointments.list);
router.post('/appointments', authorizePermissionAction('create', PERMISSIONS.REQUEST_APPOINTMENTS), appointments.create);
router.patch('/appointments/:id/review', authorizePermissionAction('update', PERMISSIONS.MANAGE_APPOINTMENTS), appointments.review);
router.patch('/appointments/:id/cancel', authorizePermissionAction('update', PERMISSIONS.REQUEST_APPOINTMENTS, PERMISSIONS.MANAGE_APPOINTMENTS), appointments.cancel);
router.get('/surveys', authorizePermissionAction('view', PERMISSIONS.MANAGE_APPOINTMENTS, PERMISSIONS.SUBMIT_SURVEYS), appointments.surveys);
router.post('/appointments/:id/survey', authorizePermissionAction('create', PERMISSIONS.SUBMIT_SURVEYS), appointments.submitSurvey);

// Rewards and discipline records (in addition to semester conduct ratings)
router.get('/rewards', authorizeRead('rewards', { personal: true }), rewards.list);
router.post('/rewards', authorizePermissionAction(['create', 'update'], PERMISSIONS.MANAGE_REWARDS), audit('CREATE', 'RewardDisciplineRecord'), rewards.create);
router.patch('/rewards/:id/review', authorizePermissionAction('execute', PERMISSIONS.MANAGE_REWARDS), rewards.review);

// Public application and tracking endpoints; staff management remains scoped and authenticated.
router.post('/admissions/public', admissions.createPublic);
router.get('/admissions/public/:code', admissions.getPublic);
router.get('/admissions', authorizePermissionAction('view', PERMISSIONS.MANAGE_ADMISSIONS), admissions.list);
router.patch('/admissions/:id/review', authorizePermissionAction('execute', PERMISSIONS.MANAGE_ADMISSIONS), admissions.review);

// Announcements
router.get('/announcements', c.listAnnouncements);
router.post('/announcements', authorizePermissionAction('create', PERMISSIONS.MANAGE_ANNOUNCEMENTS), audit('CREATE', 'Announcement'), c.createAnnouncement);
router.delete('/announcements/:id', authorizePermissionAction('delete', PERMISSIONS.MANAGE_ANNOUNCEMENTS), c.deleteAnnouncement);

// Leave
router.get('/leave-requests', c.listLeaves);
router.post('/leave-requests', authorizePermissionAction('create', PERMISSIONS.MANAGE_LEAVE), c.createLeave);
router.patch('/leave-requests/:id/review', authorizePermissionAction('execute', PERMISSIONS.MANAGE_LEAVE), authorizeRoles(ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS, ROLES.HOMEROOM_TEACHER, ROLES.CLUSTER_ADMIN), audit('REVIEW', 'LeaveRequest'), c.reviewLeave);

// Timetable
router.get('/timetables', c.listTimetables);
router.post('/timetables', authorizePermissionAction(['create', 'update'], PERMISSIONS.MANAGE_TIMETABLE), audit('UPSERT', 'Timetable'), c.upsertTimetable);
router.patch('/timetables/:id/approve', authorizePermissionAction('execute', PERMISSIONS.MANAGE_TIMETABLE), authorizeRoles(ROLES.SCHOOL_ADMIN), c.approveTimetable);

// Subscriptions
router.get('/subscriptions', authorizePermissionAction('view', PERMISSIONS.MANAGE_SUBSCRIPTIONS, PERMISSIONS.VIEW_REPORTS), a.listSubscriptions);
router.post('/subscriptions', authorizePermissionAction(['create', 'update'], PERMISSIONS.MANAGE_SUBSCRIPTIONS), audit('UPSERT', 'Subscription'), a.upsertSubscription);
router.get('/subscription-invoices', authorizePermissionAction('view', PERMISSIONS.MANAGE_SUBSCRIPTIONS), a.listSubInvoices);
router.post('/subscription-invoices', authorizePermissionAction('create', PERMISSIONS.MANAGE_SUBSCRIPTIONS), audit('CREATE', 'SubscriptionInvoice'), a.createSubInvoice);
router.patch('/subscription-invoices/:id/paid', authorizePermissionAction('execute', PERMISSIONS.MANAGE_SUBSCRIPTIONS), a.markSubInvoicePaid);

// Exams
router.get('/exams', authorizeRead('exams', { personal: true }), a.listExams);
router.get('/exams/:id', authorizeRead('exams', { personal: true }), a.getExam);
router.post('/exams', authorizePermissionAction('create', PERMISSIONS.MANAGE_EXAMS), audit('CREATE', 'Exam'), a.createExam);
router.put('/exams/:id', authorizePermissionAction('update', PERMISSIONS.MANAGE_EXAMS), audit('UPDATE', 'Exam'), a.updateExam);
router.post('/exams/:id/attempts', authorizePermissionAction('execute', PERMISSIONS.TAKE_EXAMS), a.startAttempt);
router.post('/exam-attempts/:attemptId/submit', authorizePermissionAction('execute', PERMISSIONS.TAKE_EXAMS), a.submitAttempt);
router.post('/exam-attempts/:attemptId/grade', authorizePermissionAction('update', PERMISSIONS.MANAGE_EXAMS), a.gradeAttempt);
router.get('/exam-attempts', authorizeRead('exams', { personal: true }), a.listAttempts);

// Materials
const homework = require('../controllers/homeworkController');
// Online homework uses /homeworks to keep the existing teacher-assignment API at /assignments.
router.get('/homeworks', authorizeRead('assignments', { personal: true }), homework.list);
router.get('/homeworks/:id', authorizeRead('assignments', { personal: true }), homework.get);
router.get('/homeworks/:id/submissions', authorizeRead('assignments', { personal: true }), homework.submissions);
router.post('/homeworks', authorizePermissionAction('create', PERMISSIONS.MANAGE_ASSIGNMENTS), audit('CREATE', 'Homework'), homework.create);
router.put('/homeworks/:id', authorizePermissionAction('update', PERMISSIONS.MANAGE_ASSIGNMENTS), audit('UPDATE', 'Homework'), homework.update);
router.patch('/homeworks/:id/publish', authorizePermissionAction('execute', PERMISSIONS.MANAGE_ASSIGNMENTS), audit('PUBLISH', 'Homework'), homework.publish);
router.patch('/homeworks/:id/close', authorizePermissionAction('execute', PERMISSIONS.MANAGE_ASSIGNMENTS), audit('CLOSE', 'Homework'), homework.close);
router.post('/homeworks/:id/submissions', authorizePermissionAction('create', PERMISSIONS.SUBMIT_ASSIGNMENTS), audit('SUBMIT', 'HomeworkSubmission'), homework.submit);
router.patch('/assignment-submissions/:submissionId/grade', authorizePermissionAction('update', PERMISSIONS.MANAGE_ASSIGNMENTS), audit('GRADE', 'HomeworkSubmission'), homework.grade);

const contactBooks = require('../controllers/contactBookController');
router.get('/contact-books', authorizeRead('contact_books', { personal: true }), contactBooks.list);
router.get('/contact-books/:id', authorizeRead('contact_books', { personal: true }), contactBooks.get);
router.post('/contact-books', authorizePermissionAction('create', PERMISSIONS.MANAGE_CONTACT_BOOKS), audit('CREATE', 'ContactBookEntry'), contactBooks.create);
router.put('/contact-books/:id', authorizePermissionAction('update', PERMISSIONS.MANAGE_CONTACT_BOOKS), audit('UPDATE', 'ContactBookEntry'), contactBooks.update);
router.patch('/contact-books/:id/publish', authorizePermissionAction('execute', PERMISSIONS.MANAGE_CONTACT_BOOKS), audit('PUBLISH', 'ContactBookEntry'), contactBooks.publish);
router.patch('/contact-books/:id/reply', authorizeRead('contact_books', { personal: true }), audit('REPLY', 'ContactBookEntry'), contactBooks.reply);

const classLife = require('../controllers/classLifeController');
router.get('/class-activities', authorizeRead('class_activities', { personal: true }), classLife.listActivities);
router.post('/class-activities', authorizePermissionAction('create', PERMISSIONS.MANAGE_CLASS_ACTIVITIES), audit('CREATE', 'ClassActivity'), classLife.createActivity);
router.patch('/class-activities/:id/publish', authorizePermissionAction('execute', PERMISSIONS.MANAGE_CLASS_ACTIVITIES), audit('PUBLISH', 'ClassActivity'), classLife.publishActivity);
router.get('/parent-meetings', authorizeRead('parent_meetings', { personal: true }), classLife.listMeetings);
router.post('/parent-meetings', authorizePermissionAction('create', PERMISSIONS.MANAGE_PARENT_MEETINGS), audit('CREATE', 'ParentMeeting'), classLife.createMeeting);
router.patch('/parent-meetings/:id/cancel', authorizePermissionAction('execute', PERMISSIONS.MANAGE_PARENT_MEETINGS), audit('CANCEL', 'ParentMeeting'), classLife.cancelMeeting);
router.patch('/parent-meetings/:id/rsvp', authorizeRead('parent_meetings', { personal: true }), audit('RSVP', 'ParentMeetingResponse'), classLife.rsvp);

const clubs = require('../controllers/clubController');
router.get('/clubs', authorizeRead('clubs', { personal: true }), clubs.listClubs);
router.post('/clubs', authorizePermissionAction('create', PERMISSIONS.MANAGE_CLUBS), audit('CREATE', 'Club'), clubs.createClub);
router.post('/clubs/:id/register', authorizePermissionAction('create', PERMISSIONS.REGISTER_CLUBS), audit('REGISTER', 'ClubRegistration'), clubs.register);
router.patch('/club-registrations/:id/cancel', authorizePermissionAction('update', PERMISSIONS.REGISTER_CLUBS), audit('CANCEL', 'ClubRegistration'), clubs.cancel);
router.get('/club-registrations', authorizeRead('clubs', { personal: true }), clubs.registrations);
router.get('/retake-requests', authorizeRead('retakes', { personal: true }), clubs.retakes);
router.post('/retake-requests', authorizePermissionAction('create', PERMISSIONS.REQUEST_RETAKES), audit('CREATE', 'RetakeRequest'), clubs.createRetake);
router.patch('/retake-requests/:id/review', authorizePermissionAction('execute', PERMISSIONS.MANAGE_RETAKES), audit('REVIEW', 'RetakeRequest'), clubs.reviewRetake);

router.get('/materials', authorizeRead('materials', { personal: true }), a.listMaterials);
router.post('/materials', authorizePermissionAction('create', PERMISSIONS.MANAGE_MATERIALS), audit('CREATE', 'LearningMaterial'), a.createMaterial);
router.delete('/materials/:id', authorizePermissionAction('delete', PERMISSIONS.MANAGE_MATERIALS), a.deleteMaterial);

// Library
router.get('/library/books', authorizeRead('library', { personal: true }), a.listBooks);
router.post('/library/books', authorizePermissionAction('create', PERMISSIONS.MANAGE_LIBRARY), audit('CREATE', 'LibraryBook'), a.createBook);
router.put('/library/books/:id', authorizePermissionAction('update', PERMISSIONS.MANAGE_LIBRARY), a.updateBook);
router.get('/library/loans', authorizeRead('library', { personal: true }), a.listLoans);
router.post('/library/loans', authorizePermissionAction('create', PERMISSIONS.MANAGE_LIBRARY), audit('CREATE', 'BookLoan'), a.borrowBook);
router.patch('/library/loans/:id/return', authorizePermissionAction('execute', PERMISSIONS.MANAGE_LIBRARY), a.returnBook);

// Facilities
router.get('/facilities', authorizeRead('facilities', { personal: false }), a.listFacilities);
router.post('/facilities', authorizePermissionAction('create', PERMISSIONS.MANAGE_FACILITIES), audit('CREATE', 'FacilityRequest'), a.createFacility);
router.patch('/facilities/:id/review', authorizePermissionAction('execute', PERMISSIONS.MANAGE_FACILITIES), authorizeRoles(ROLES.LIBRARIAN, ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS), audit('REVIEW', 'FacilityRequest'), a.reviewFacility);

// Audit / Support / Conduct / Templates
router.get('/audit-logs', authorizePermissionAction('view', PERMISSIONS.VIEW_AUDIT), a.listAuditLogs);
router.get('/support-tickets', authorizePermissionAction('view', PERMISSIONS.MANAGE_SUPPORT), a.listTickets);
router.post('/support-tickets', authorizePermissionAction('create', PERMISSIONS.MANAGE_SUPPORT), audit('CREATE', 'SupportTicket'), a.createTicket);
router.patch('/support-tickets/:id', authorizePermissionAction('update', PERMISSIONS.MANAGE_SUPPORT), a.updateTicket);
router.get('/conduct', authorizeRead('conduct', { personal: true }), a.listConduct);
router.post('/conduct', authorizePermissionAction(['create', 'update'], PERMISSIONS.MANAGE_CONDUCT), audit('UPSERT', 'ConductRecord'), a.upsertConduct);
router.get('/templates', authorizeRead('templates', { personal: false }), a.listTemplates);
router.post('/templates', authorizePermissionAction('create', PERMISSIONS.MANAGE_TEMPLATES), audit('CREATE', 'SharedTemplate'), a.createTemplate);
router.put('/templates/:id', authorizePermissionAction('update', PERMISSIONS.MANAGE_TEMPLATES), a.updateTemplate);
router.post('/schools/:schoolId/apply-template', authorizePermissionAction('execute', PERMISSIONS.MANAGE_TEMPLATES), a.applyTemplate);

// Cross-role: messaging, calendar, search, export
const x = require('../controllers/crossController');
router.get('/messages', x.listMessages);
router.post('/messages', audit('CREATE', 'Message'), x.sendMessage);
router.patch('/messages/:id/read', x.markMessageRead);
router.get('/calendar', x.listEvents);
router.post('/calendar', authorizePermissionAction('create', PERMISSIONS.MANAGE_ANNOUNCEMENTS), audit('CREATE', 'CalendarEvent'), x.createEvent);
router.delete('/calendar/:id', authorizePermissionAction('delete', PERMISSIONS.MANAGE_ANNOUNCEMENTS), x.deleteEvent);
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
  authorizePermissionAction(['create', 'update'], PERMISSIONS.MANAGE_USERS),
  upload.single('file'),
  audit('IMPORT', 'User'),
  imp.importUsers
);
router.post(
  '/import/grades',
  authorizePermissionAction(['create', 'update'], PERMISSIONS.ENTER_GRADES),
  upload.single('file'),
  audit('IMPORT', 'Grade'),
  imp.importGrades
);
router.post(
  '/import/fees',
  authorizePermissionAction(['create', 'update'], PERMISSIONS.MANAGE_FEES),
  upload.single('file'),
  audit('IMPORT', 'FeeInvoice'),
  imp.importFees
);
router.post(
  '/import/attendance',
  authorizePermissionAction(['create', 'update'], PERMISSIONS.TAKE_ATTENDANCE),
  upload.single('file'),
  audit('IMPORT', 'Attendance'),
  imp.importAttendance
);

module.exports = router;
