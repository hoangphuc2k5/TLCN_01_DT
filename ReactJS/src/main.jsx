import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import App from './App.jsx';
import store from './store/store.js';
import { PrivateRoute } from './components/guards/AuthGuards.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import { ROLES } from './constants/roles.js';
import './styles/global.css';

const LoginPage = lazy(() => import('./features/auth/LoginPage.jsx'));
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage.jsx'));
const ClustersPage = lazy(() => import('./features/schools/ClustersPage.jsx'));
const SchoolsPage = lazy(() => import('./features/schools/SchoolsPage.jsx'));
const UsersPage = lazy(() => import('./features/users/UsersPage.jsx'));
const RolesPage = lazy(() => import('./features/roles/RolesPage.jsx'));
const ClassesPage = lazy(() => import('./features/classes/ClassesPage.jsx'));
const AttendancePage = lazy(() => import('./features/attendance/AttendancePage.jsx'));
const GradesPage = lazy(() => import('./features/grades/GradesPage.jsx'));
const VnpayReturnPage = lazy(() => import('./features/fees/VnpayReturnPage.jsx'));
const FeesPage = lazy(() => import('./features/fees/FeesPage.jsx'));
const AppointmentsPage = lazy(() => import('./features/appointments/AppointmentsPage.jsx'));
const RewardsPage = lazy(() => import('./features/rewards/RewardsPage.jsx'));
const AdmissionApplyPage = lazy(() => import('./features/admissions/AdmissionApplyPage.jsx'));
const AdmissionsPage = lazy(() => import('./features/admissions/AdmissionsPage.jsx'));
const AnnouncementsPage = lazy(() => import('./features/announcements/AnnouncementsPage.jsx'));
const LeavePage = lazy(() => import('./features/leave/LeavePage.jsx'));
const TimetablePage = lazy(() => import('./features/timetable/TimetablePage.jsx'));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage.jsx'));
const SubscriptionsPage = lazy(() => import('./features/subscriptions/SubscriptionsPage.jsx'));
const ExamsPage = lazy(() => import('./features/exams/ExamsPage.jsx'));
const MaterialsPage = lazy(() => import('./features/library/MaterialsPage.jsx'));
const LibraryPage = lazy(() => import('./features/library/LibraryPage.jsx'));
const FacilitiesPage = lazy(() => import('./features/facilities/FacilitiesPage.jsx'));
const AuditLogsPage = lazy(() => import('./features/admin/AuditLogsPage.jsx'));
const SupportPage = lazy(() => import('./features/admin/SupportPage.jsx'));
const ConductPage = lazy(() => import('./features/conduct/ConductPage.jsx'));
const TemplatesPage = lazy(() => import('./features/admin/TemplatesPage.jsx'));
const MessagesPage = lazy(() => import('./features/messages/MessagesPage.jsx'));
const CalendarPage = lazy(() => import('./features/calendar/CalendarPage.jsx'));
const JobsPage = lazy(() => import('./features/admin/JobsPage.jsx'));
const AssignmentsPage = lazy(() => import('./features/assignments/AssignmentsPage.jsx'));
const LessonPlansPage = lazy(() => import('./features/lesson-plans/LessonPlansPage.jsx'));
const ContactBookPage = lazy(() => import('./features/contact-book/ContactBookPage.jsx'));
const ClassLifePage = lazy(() => import('./features/class-life/ClassLifePage.jsx'));
const ActivitiesPage = lazy(() => import('./features/activities/ActivitiesPage.jsx'));
const StudentDocumentsPage = lazy(() => import('./features/student-documents/StudentDocumentsPage.jsx'));
const PayrollPage = lazy(() => import('./features/fees/PayrollPage.jsx'));
const EquipmentMaintenancePage = lazy(() => import('./features/facilities/EquipmentMaintenancePage.jsx'));
const MonitoringPage = lazy(() => import('./features/admin/MonitoringPage.jsx'));
const SchoolComparisonPage = lazy(() => import('./features/admin/SchoolComparisonPage.jsx'));

const router = createBrowserRouter([
  { path: '/payments/vnpay-return', element: <VnpayReturnPage /> },
  {
    path: '/login',
    element: <LoginPage />,
  },
  { path: '/admissions/apply', element: <AdmissionApplyPage /> },
  {
    path: '/',
    element: <App />,
    children: [
      {
        element: <PrivateRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <Navigate to="/dashboard" replace /> },
              { path: 'dashboard', element: <DashboardPage /> },
              {
                element: <Outlet />,
                children: [
                  { path: 'clusters', element: <ClustersPage /> },
                  { path: 'subscriptions', element: <SubscriptionsPage /> },
                ],
              },
              { path: 'schools', element: <SchoolsPage /> },
              { path: 'users', element: <UsersPage /> },
              { path: 'roles', element: <RolesPage /> },
              { path: 'classes', element: <ClassesPage /> },
              { path: 'attendance', element: <AttendancePage /> },
              { path: 'grades', element: <GradesPage /> },
              { path: 'fees', element: <FeesPage /> },
              { path: 'payroll', element: <PayrollPage /> },
              { path: 'equipment-maintenance', element: <EquipmentMaintenancePage /> },
              { path: 'monitoring', element: <MonitoringPage /> },
              { path: 'school-comparison', element: <SchoolComparisonPage /> },
              { path: 'appointments', element: <AppointmentsPage /> },
              { path: 'rewards', element: <RewardsPage /> },
              { path: 'admissions', element: <AdmissionsPage /> },
              { path: 'announcements', element: <AnnouncementsPage /> },
              { path: 'messages', element: <MessagesPage /> },
              { path: 'calendar', element: <CalendarPage /> },
              { path: 'leave', element: <LeavePage /> },
              { path: 'timetable', element: <TimetablePage /> },
              { path: 'profile', element: <ProfilePage /> },
              { path: 'exams', element: <ExamsPage /> },
              { path: 'materials', element: <MaterialsPage /> },
              { path: 'library', element: <LibraryPage /> },
              { path: 'facilities', element: <FacilitiesPage /> },
              { path: 'audit-logs', element: <AuditLogsPage /> },
              { path: 'support', element: <SupportPage /> },
              { path: 'conduct', element: <ConductPage /> },
              { path: 'templates', element: <TemplatesPage /> },
              { path: 'jobs', element: <JobsPage /> },
  { path: 'assignments', element: <AssignmentsPage /> },
  { path: 'lesson-plans', element: <LessonPlansPage /> },
  { path: 'contact-book', element: <ContactBookPage /> },
  { path: 'class-life', element: <ClassLifePage /> },
              { path: 'activities', element: <ActivitiesPage /> },
              { path: 'student-documents', element: <StudentDocumentsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ConfigProvider
        locale={viVN}
        theme={{
          token: {
            colorPrimary: '#0f4c5c',
            borderRadius: 8,
            fontFamily: "'Be Vietnam Pro', 'Segoe UI', sans-serif",
          },
        }}
      >
        <Suspense fallback={<div role="status" aria-live="polite">Đang tải...</div>}>
          <RouterProvider router={router} />
        </Suspense>
      </ConfigProvider>
    </Provider>
  </React.StrictMode>
);
