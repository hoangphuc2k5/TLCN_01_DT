import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import App from './App.jsx';
import store from './Redux/store.js';
import { PrivateRoute, RoleRoute } from './components/guards/AuthGuards.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import LoginPage from './pages/login.jsx';
import DashboardPage from './features/dashboard/DashboardPage.jsx';
import ClustersPage from './features/schools/ClustersPage.jsx';
import SchoolsPage from './features/schools/SchoolsPage.jsx';
import UsersPage from './features/users/UsersPage.jsx';
import RolesPage from './features/roles/RolesPage.jsx';
import ClassesPage from './features/classes/ClassesPage.jsx';
import AttendancePage from './features/attendance/AttendancePage.jsx';
import GradesPage from './features/grades/GradesPage.jsx';
import FeesPage from './features/fees/FeesPage.jsx';
import AnnouncementsPage from './features/announcements/AnnouncementsPage.jsx';
import LeavePage from './features/leave/LeavePage.jsx';
import TimetablePage from './features/timetable/TimetablePage.jsx';
import ProfilePage from './features/profile/ProfilePage.jsx';
import SubscriptionsPage from './features/subscriptions/SubscriptionsPage.jsx';
import ExamsPage from './features/exams/ExamsPage.jsx';
import MaterialsPage from './features/library/MaterialsPage.jsx';
import LibraryPage from './features/library/LibraryPage.jsx';
import FacilitiesPage from './features/facilities/FacilitiesPage.jsx';
import AuditLogsPage from './features/admin/AuditLogsPage.jsx';
import SupportPage from './features/admin/SupportPage.jsx';
import ConductPage from './features/conduct/ConductPage.jsx';
import TemplatesPage from './features/admin/TemplatesPage.jsx';
import MessagesPage from './features/messages/MessagesPage.jsx';
import CalendarPage from './features/calendar/CalendarPage.jsx';
import { ROLES } from './constants/roles.js';
import './styles/global.css';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
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
                element: <RoleRoute roles={[ROLES.SUPER_ADMIN]} />,
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
        <RouterProvider router={router} />
      </ConfigProvider>
    </Provider>
  </React.StrictMode>
);
