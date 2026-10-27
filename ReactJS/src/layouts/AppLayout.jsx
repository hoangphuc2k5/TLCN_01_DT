import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Layout, Menu, Button, Drawer, Grid, Dropdown, Tooltip } from 'antd';
import {
  AppstoreOutlined,
  DashboardOutlined,
  BankOutlined,
  TeamOutlined,
  ReadOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  FormOutlined,
  DollarOutlined,
  BellOutlined,
  NotificationOutlined,
  FileTextOutlined,
  UserOutlined,
  LogoutOutlined,
  ExperimentOutlined,
  BookOutlined,
  ToolOutlined,
  AuditOutlined,
  CustomerServiceOutlined,
  SmileOutlined,
  FileDoneOutlined,
  CloudServerOutlined,
  MailOutlined,
  ScheduleOutlined,
  SafetyCertificateOutlined,
  MenuOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import PageHeader from '../components/layout/PageHeader';
import { getPageMetadata } from '../constants/page-metadata';
import { logout } from '../store/auth.slice';
import { ROLES, ROLE_LABELS } from '../constants/roles';
import { canVisit } from '../utils/permissions';
import accountAvatar from '../features/dashboard/assets/figma/account-avatar.svg';
import brandLeafTeal from '../features/dashboard/assets/figma/brand-leaf-teal.svg';
import brandLeafAmber from '../features/dashboard/assets/figma/brand-leaf-amber.svg';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

const canManageRoles = (user) => {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if ((user.permissions || []).includes('MANAGE_ROLES')) return true;
  return (user.permissionEntries || []).some(
    (p) => p.resource === 'roles' && (p.actions || []).includes('view')
  );
};

const dashboardNavByRole = {
  [ROLES.SUPER_ADMIN]: [
    ['CHUNG', [['Tổng quan', '/dashboard']]],
    ['NGHIỆP VỤ', [['Trường học', '/schools'], ['Cụm trường', '/clusters'], ['Tài khoản', '/users'], ['Phân quyền', '/roles'], ['Thông báo', '/announcements'], ['Nhật ký hệ thống', '/audit-logs']]],
    ['TÀI KHOẢN', [['Thông tin cá nhân', '/profile'], ['Trợ giúp', '/support']]],
  ],
  [ROLES.CLUSTER_ADMIN]: [
    ['CHUNG', [['Tổng quan', '/dashboard']]],
    ['NGHIỆP VỤ', [['Trường trong cụm', '/schools'], ['Tài khoản', '/users'], ['Học phí', '/fees'], ['Báo cáo', '/school-comparison'], ['Thông báo', '/announcements'], ['Hỗ trợ kỹ thuật', '/support']]],
    ['TÀI KHOẢN', [['Thông tin cá nhân', '/profile'], ['Trợ giúp', '/messages']]],
  ],
  [ROLES.SCHOOL_ADMIN]: [
    ['CHUNG', [['Tổng quan', '/dashboard']]],
    ['NGHIỆP VỤ', [['Học sinh / nhân sự', '/users'], ['Lớp & môn', '/classes'], ['Điểm danh', '/attendance'], ['Điểm số', '/grades'], ['Học phí', '/fees'], ['Tuyển sinh', '/admissions'], ['Thông báo', '/announcements']]],
    ['TÀI KHOẢN', [['Thông tin cá nhân', '/profile'], ['Trợ giúp', '/messages']]],
  ],
  [ROLES.ACADEMIC_AFFAIRS]: [
    ['CHUNG', [['Tổng quan', '/dashboard']]],
    ['NGHIỆP VỤ', [['Học sinh / giáo viên', '/users'], ['Lớp & môn', '/classes'], ['Điểm danh', '/attendance'], ['Thi online', '/exams'], ['Học liệu', '/materials'], ['Bài tập', '/assignments'], ['Hồ sơ học sinh', '/student-documents'], ['Giáo án', '/lesson-plans']]],
    ['TÀI KHOẢN', [['Thông tin cá nhân', '/profile'], ['Trợ giúp', '/messages']]],
  ],
  [ROLES.SUBJECT_TEACHER]: [
    ['CHUNG', [['Tổng quan', '/dashboard']]],
    ['NGHIỆP VỤ', [['Lớp phụ trách', '/classes'], ['Điểm danh', '/attendance'], ['Nhập điểm', '/grades'], ['Thi online', '/exams'], ['Học liệu', '/materials'], ['Bài tập', '/assignments'], ['Sổ liên lạc', '/contact-book'], ['Lịch hẹn', '/appointments']]],
    ['TÀI KHOẢN', [['Thông tin cá nhân', '/profile'], ['Trợ giúp', '/messages']]],
  ],
  [ROLES.HOMEROOM_TEACHER]: [
    ['CHUNG', [['Tổng quan', '/dashboard']]],
    ['NGHIỆP VỤ', [['Lớp chủ nhiệm', '/classes'], ['Điểm danh', '/attendance'], ['Điểm số', '/grades'], ['Hạnh kiểm', '/conduct'], ['Khen thưởng', '/rewards'], ['Hồ sơ học sinh', '/student-documents'], ['Sổ liên lạc', '/contact-book'], ['Sinh hoạt lớp', '/class-life']]],
    ['TÀI KHOẢN', [['Thông tin cá nhân', '/profile'], ['Trợ giúp', '/messages']]],
  ],
  [ROLES.ACCOUNTANT]: [
    ['CHUNG', [['Tổng quan', '/dashboard']]],
    ['NGHIỆP VỤ', [['Học phí', '/fees'], ['Bảng lương', '/payroll'], ['Báo cáo thu', '/school-comparison']]],
    ['TÀI KHOẢN', [['Thông tin cá nhân', '/profile'], ['Trợ giúp', '/messages']]],
  ],
  [ROLES.LIBRARIAN]: [
    ['CHUNG', [['Tổng quan', '/dashboard']]],
    ['NGHIỆP VỤ', [['Thư viện & mượn trả', '/library'], ['Cơ sở vật chất', '/facilities'], ['Yêu cầu chờ duyệt', '/equipment-maintenance']]],
    ['TÀI KHOẢN', [['Thông tin cá nhân', '/profile'], ['Trợ giúp', '/messages']]],
  ],
  [ROLES.STUDENT]: [
    ['CHUNG', [['Tổng quan', '/dashboard']]],
    ['NGHIỆP VỤ', [['Kết quả học tập', '/grades'], ['Chuyên cần', '/attendance'], ['Học phí', '/fees'], ['Thi online', '/exams'], ['Học liệu', '/materials'], ['Bài tập', '/assignments'], ['Sổ liên lạc', '/contact-book'], ['Thư viện', '/library']]],
    ['TÀI KHOẢN', [['Thông tin cá nhân', '/profile'], ['Trợ giúp', '/messages']]],
  ],
  [ROLES.PARENT]: [
    ['CHUNG', [['Tổng quan', '/dashboard']]],
    ['NGHIỆP VỤ', [['Điểm con', '/grades'], ['Điểm danh', '/attendance'], ['Học phí', '/fees'], ['Kết quả thi', '/exams'], ['Bài tập', '/assignments'], ['Sổ liên lạc', '/contact-book'], ['Lịch hẹn', '/appointments'], ['Thư viện', '/library']]],
    ['TÀI KHOẢN', [['Thông tin cá nhân', '/profile'], ['Trợ giúp', '/messages']]],
  ],
};

const dashboardMenuByRole = (role, user) => {
  const sourceGroups = dashboardNavByRole[role] || [['CHUNG', [['Tổng quan', '/dashboard']]]];
  const legacyItems = menuByRole(role, user);
  const legacyItemsByPath = new Map(legacyItems.map((item) => [item.key, item]));
  const entries = new Map();
  for (const [, groupEntries] of sourceGroups) {
    for (const [title, path] of groupEntries) if (!entries.has(path)) entries.set(path, title);
  }
  for (const item of legacyItems) {
    if (!entries.has(item.key)) entries.set(item.key, item.label?.props?.children || item.key);
  }

  const groupLabels = ['TỔ CHỨC', 'NGƯỜI DÙNG & QUYỀN', 'HỌC VỤ', 'VẬN HÀNH', 'TÀI KHOẢN'];
  const groupedEntries = new Map(groupLabels.map((label) => [label, []]));
  const accountPaths = new Set(['/profile', '/messages', '/support']);
  const organizationPaths = new Set(['/schools', '/clusters']);
  const identityPaths = new Set(['/users', '/roles']);
  const operationPaths = new Set(['/fees', '/payroll', '/facilities', '/equipment-maintenance', '/monitoring', '/jobs', '/audit-logs', '/subscriptions', '/templates', '/school-comparison']);
  for (const [path, title] of entries) {
    if (path === '/dashboard') continue;
    const group = accountPaths.has(path) ? 'TÀI KHOẢN'
      : organizationPaths.has(path) ? 'TỔ CHỨC'
        : identityPaths.has(path) ? 'NGƯỜI DÙNG & QUYỀN'
          : operationPaths.has(path) ? 'VẬN HÀNH' : 'HỌC VỤ';
    groupedEntries.get(group).push([title, path]);
  }
  const dashboardIcons = {
    '/dashboard': <DashboardOutlined />,
    '/schools': <BankOutlined />,
    '/clusters': <AppstoreOutlined />,
    '/users': <TeamOutlined />,
    '/roles': <SafetyCertificateOutlined />,
    '/announcements': <NotificationOutlined />,
    '/audit-logs': <AuditOutlined />,
    '/subscriptions': <CloudServerOutlined />,
    '/templates': <FileDoneOutlined />,
    '/lesson-plans': <ReadOutlined />,
    '/student-documents': <FileTextOutlined />,
    '/payroll': <DollarOutlined />,
    '/equipment-maintenance': <ToolOutlined />,
    '/monitoring': <CloudServerOutlined />,
    '/jobs': <CloudServerOutlined />,
    '/library': <BookOutlined />,
    '/classes': <ReadOutlined />,
    '/attendance': <CheckSquareOutlined />,
    '/grades': <FormOutlined />,
    '/exams': <ExperimentOutlined />,
    '/materials': <BookOutlined />,
    '/assignments': <FormOutlined />,
    '/contact-book': <MailOutlined />,
    '/class-life': <ScheduleOutlined />,
    '/appointments': <CalendarOutlined />,
    '/conduct': <SmileOutlined />,
    '/rewards': <SmileOutlined />,
    '/admissions': <TeamOutlined />,
    '/activities': <ScheduleOutlined />,
    '/calendar': <CalendarOutlined />,
    '/leave': <FileTextOutlined />,
    '/timetable': <ScheduleOutlined />,
    '/profile': <UserOutlined />,
    '/messages': <MailOutlined />,
    '/support': <CustomerServiceOutlined />,
  };
  const toMenuItem = ([title, path]) => ({
    key: path,
    icon: dashboardIcons[path] || legacyItemsByPath.get(path)?.icon || <ReadOutlined />,
    label: <Link to={path}>{title}</Link>,
  });
  const dashboardItem = canVisit(user, '/dashboard') ? [toMenuItem([entries.get('/dashboard') || 'Tổng quan', '/dashboard'])] : [];
  const collapsibleGroups = groupLabels.map((label) => ({
    key: `section:${label}`,
    label,
    children: groupedEntries.get(label).filter(([, path]) => canVisit(user, path)).map(toMenuItem),
  })).filter((group) => group.children.length);
  return [...dashboardItem, ...collapsibleGroups];
};

const getSchoolYear = () => {
  const now = new Date();
  const start = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `Năm học ${start} – ${start + 1}`;
};

const getInitials = (name) => String(name || 'EduMoet').trim().split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase();

const menuByRole = (role, user) => {
  const common = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: <Link to="/dashboard">Tổng quan</Link> },
    { key: '/announcements', icon: <NotificationOutlined />, label: <Link to="/announcements">Thông báo</Link> },
    { key: '/messages', icon: <MailOutlined />, label: <Link to="/messages">Tin nhắn</Link> },
    { key: '/calendar', icon: <CalendarOutlined />, label: <Link to="/calendar">Lịch</Link> },
    { key: '/leave', icon: <FileTextOutlined />, label: <Link to="/leave">Đơn từ</Link> },
    { key: '/timetable', icon: <ScheduleOutlined />, label: <Link to="/timetable">Thời khóa biểu</Link> },
    { key: '/profile', icon: <UserOutlined />, label: <Link to="/profile">Hồ sơ</Link> },
  ];

  const rolesItem = {
    key: '/roles',
    icon: <SafetyCertificateOutlined />,
    label: <Link to="/roles">Vai trò</Link>,
  };

  const maps = {
    [ROLES.SUPER_ADMIN]: [
      { key: '/clusters', icon: <BankOutlined />, label: <Link to="/clusters">Cụm trường</Link> },
      { key: '/schools', icon: <BankOutlined />, label: <Link to="/schools">Trường học</Link> },
      { key: '/users', icon: <TeamOutlined />, label: <Link to="/users">Người dùng</Link> },
      rolesItem,
      { key: '/subscriptions', icon: <CloudServerOutlined />, label: <Link to="/subscriptions">Gói dịch vụ</Link> },
      { key: '/templates', icon: <FileDoneOutlined />, label: <Link to="/templates">Mẫu dùng chung</Link> },
      { key: '/support', icon: <CustomerServiceOutlined />, label: <Link to="/support">Hỗ trợ kỹ thuật</Link> },
      { key: '/audit-logs', icon: <AuditOutlined />, label: <Link to="/audit-logs">Nhật ký hệ thống</Link> },
    ],
    [ROLES.CLUSTER_ADMIN]: [
      { key: '/schools', icon: <BankOutlined />, label: <Link to="/schools">Trường trong cụm</Link> },
      { key: '/users', icon: <TeamOutlined />, label: <Link to="/users">Người dùng</Link> },
      rolesItem,
      { key: '/templates', icon: <FileDoneOutlined />, label: <Link to="/templates">Mẫu dùng chung</Link> },
      { key: '/support', icon: <CustomerServiceOutlined />, label: <Link to="/support">Hỗ trợ kỹ thuật</Link> },
      { key: '/fees', icon: <DollarOutlined />, label: <Link to="/fees">Học phí (xem)</Link> },
    ],
    [ROLES.SCHOOL_ADMIN]: [
      { key: '/schools', icon: <BankOutlined />, label: <Link to="/schools">Thông tin trường</Link> },
      { key: '/users', icon: <TeamOutlined />, label: <Link to="/users">Tài khoản</Link> },
      rolesItem,
      { key: '/classes', icon: <ReadOutlined />, label: <Link to="/classes">Lớp & môn</Link> },
      { key: '/attendance', icon: <CheckSquareOutlined />, label: <Link to="/attendance">Điểm danh</Link> },
      { key: '/grades', icon: <FormOutlined />, label: <Link to="/grades">Điểm số</Link> },
      { key: '/fees', icon: <DollarOutlined />, label: <Link to="/fees">Học phí</Link> },
      { key: '/exams', icon: <ExperimentOutlined />, label: <Link to="/exams">Thi online</Link> },
      { key: '/materials', icon: <BookOutlined />, label: <Link to="/materials">Học liệu</Link> },
      { key: '/assignments', icon: <FormOutlined />, label: <Link to="/assignments">Bài tập</Link> },
      { key: '/contact-book', icon: <FormOutlined />, label: <Link to="/contact-book">Sổ liên lạc</Link> },
      { key: '/class-life', icon: <FormOutlined />, label: <Link to="/class-life">Sinh hoạt lớp</Link> },
      { key: '/appointments', icon: <CalendarOutlined />, label: <Link to="/appointments">Lịch hẹn phụ huynh</Link> },
      { key: '/activities', icon: <FormOutlined />, label: <Link to="/activities">CLB / môn tự chọn</Link> },
      { key: '/conduct', icon: <SmileOutlined />, label: <Link to="/conduct">Hạnh kiểm</Link> },
      { key: '/rewards', icon: <SmileOutlined />, label: <Link to="/rewards">Thi đua - Khen thưởng</Link> },
      { key: '/admissions', icon: <TeamOutlined />, label: <Link to="/admissions">Tuyển sinh</Link> },
      { key: '/templates', icon: <FileDoneOutlined />, label: <Link to="/templates">Mẫu dùng chung</Link> },
      { key: '/support', icon: <CustomerServiceOutlined />, label: <Link to="/support">Hỗ trợ kỹ thuật</Link> },
      { key: '/audit-logs', icon: <AuditOutlined />, label: <Link to="/audit-logs">Nhật ký</Link> },
    ],
    [ROLES.ACADEMIC_AFFAIRS]: [
      { key: '/users', icon: <TeamOutlined />, label: <Link to="/users">Học sinh/GV</Link> },
      { key: '/classes', icon: <ReadOutlined />, label: <Link to="/classes">Lớp & môn</Link> },
      { key: '/attendance', icon: <CheckSquareOutlined />, label: <Link to="/attendance">Điểm danh</Link> },
      { key: '/exams', icon: <ExperimentOutlined />, label: <Link to="/exams">Thi online</Link> },
      { key: '/materials', icon: <BookOutlined />, label: <Link to="/materials">Học liệu</Link> },
      { key: '/assignments', icon: <FormOutlined />, label: <Link to="/assignments">Bài tập</Link> },
      { key: '/contact-book', icon: <FormOutlined />, label: <Link to="/contact-book">Sổ liên lạc</Link> },
      { key: '/class-life', icon: <FormOutlined />, label: <Link to="/class-life">Sinh hoạt lớp</Link> },
      { key: '/appointments', icon: <CalendarOutlined />, label: <Link to="/appointments">Lịch hẹn phụ huynh</Link> },
      { key: '/facilities', icon: <ToolOutlined />, label: <Link to="/facilities">Cơ sở vật chất</Link> },
    ],
    [ROLES.SUBJECT_TEACHER]: [
      { key: '/classes', icon: <ReadOutlined />, label: <Link to="/classes">Lớp phụ trách</Link> },
      { key: '/attendance', icon: <CheckSquareOutlined />, label: <Link to="/attendance">Điểm danh</Link> },
      { key: '/grades', icon: <FormOutlined />, label: <Link to="/grades">Nhập điểm</Link> },
      { key: '/exams', icon: <ExperimentOutlined />, label: <Link to="/exams">Thi online</Link> },
      { key: '/materials', icon: <BookOutlined />, label: <Link to="/materials">Học liệu</Link> },
      { key: '/assignments', icon: <FormOutlined />, label: <Link to="/assignments">Bài tập</Link> },
      { key: '/contact-book', icon: <FormOutlined />, label: <Link to="/contact-book">Sổ liên lạc</Link> },
      { key: '/class-life', icon: <FormOutlined />, label: <Link to="/class-life">Sinh hoạt lớp</Link> },
      { key: '/appointments', icon: <CalendarOutlined />, label: <Link to="/appointments">Lịch hẹn phụ huynh</Link> },
      { key: '/facilities', icon: <ToolOutlined />, label: <Link to="/facilities">Mượn phòng/TB</Link> },
    ],
    [ROLES.HOMEROOM_TEACHER]: [
      { key: '/classes', icon: <ReadOutlined />, label: <Link to="/classes">Lớp chủ nhiệm</Link> },
      { key: '/attendance', icon: <CheckSquareOutlined />, label: <Link to="/attendance">Điểm danh</Link> },
      { key: '/grades', icon: <FormOutlined />, label: <Link to="/grades">Điểm số</Link> },
      { key: '/conduct', icon: <SmileOutlined />, label: <Link to="/conduct">Hạnh kiểm</Link> },
      { key: '/rewards', icon: <SmileOutlined />, label: <Link to="/rewards">Thi đua - Khen thưởng</Link> },
      { key: '/admissions', icon: <TeamOutlined />, label: <Link to="/admissions">Tuyển sinh</Link> },
      { key: '/exams', icon: <ExperimentOutlined />, label: <Link to="/exams">Thi online</Link> },
      { key: '/materials', icon: <BookOutlined />, label: <Link to="/materials">Học liệu</Link> },
      { key: '/assignments', icon: <FormOutlined />, label: <Link to="/assignments">Bài tập</Link> },
      { key: '/contact-book', icon: <FormOutlined />, label: <Link to="/contact-book">Sổ liên lạc</Link> },
      { key: '/class-life', icon: <FormOutlined />, label: <Link to="/class-life">Sinh hoạt lớp</Link> },
      { key: '/appointments', icon: <CalendarOutlined />, label: <Link to="/appointments">Lịch hẹn phụ huynh</Link> },
      { key: '/facilities', icon: <ToolOutlined />, label: <Link to="/facilities">Mượn phòng/TB</Link> },
    ],
    [ROLES.ACCOUNTANT]: [
      { key: '/fees', icon: <DollarOutlined />, label: <Link to="/fees">Học phí</Link> },
    ],
    [ROLES.LIBRARIAN]: [
      { key: '/library', icon: <BookOutlined />, label: <Link to="/library">Thư viện</Link> },
      { key: '/facilities', icon: <ToolOutlined />, label: <Link to="/facilities">CSVC / Duyệt mượn</Link> },
    ],
    [ROLES.STUDENT]: [
      { key: '/grades', icon: <FormOutlined />, label: <Link to="/grades">Kết quả học tập</Link> },
      { key: '/attendance', icon: <CheckSquareOutlined />, label: <Link to="/attendance">Chuyên cần</Link> },
      { key: '/fees', icon: <DollarOutlined />, label: <Link to="/fees">Học phí</Link> },
      { key: '/exams', icon: <ExperimentOutlined />, label: <Link to="/exams">Thi online</Link> },
      { key: '/materials', icon: <BookOutlined />, label: <Link to="/materials">Học liệu</Link> },
      { key: '/assignments', icon: <FormOutlined />, label: <Link to="/assignments">Bài tập</Link> },
      { key: '/contact-book', icon: <FormOutlined />, label: <Link to="/contact-book">Sổ liên lạc</Link> },
      { key: '/class-life', icon: <FormOutlined />, label: <Link to="/class-life">Sinh hoạt lớp</Link> },
      { key: '/appointments', icon: <CalendarOutlined />, label: <Link to="/appointments">Lịch hẹn phụ huynh</Link> },
      { key: '/activities', icon: <FormOutlined />, label: <Link to="/activities">CLB / môn tự chọn</Link> },
      { key: '/library', icon: <BookOutlined />, label: <Link to="/library">Thư viện</Link> },
      { key: '/conduct', icon: <SmileOutlined />, label: <Link to="/conduct">Hạnh kiểm</Link> },
      { key: '/rewards', icon: <SmileOutlined />, label: <Link to="/rewards">Thi đua - Khen thưởng</Link> },
      { key: '/admissions', icon: <TeamOutlined />, label: <Link to="/admissions">Tuyển sinh</Link> },
    ],
    [ROLES.PARENT]: [
      { key: '/grades', icon: <FormOutlined />, label: <Link to="/grades">Điểm con</Link> },
      { key: '/attendance', icon: <CheckSquareOutlined />, label: <Link to="/attendance">Điểm danh</Link> },
      { key: '/fees', icon: <DollarOutlined />, label: <Link to="/fees">Học phí</Link> },
      { key: '/exams', icon: <ExperimentOutlined />, label: <Link to="/exams">Kết quả thi</Link> },
      { key: '/conduct', icon: <SmileOutlined />, label: <Link to="/conduct">Hạnh kiểm</Link> },
      { key: '/rewards', icon: <SmileOutlined />, label: <Link to="/rewards">Thi đua - Khen thưởng</Link> },
      { key: '/admissions', icon: <TeamOutlined />, label: <Link to="/admissions">Tuyển sinh</Link> },
      { key: '/assignments', icon: <FormOutlined />, label: <Link to="/assignments">Bài tập</Link> },
      { key: '/contact-book', icon: <FormOutlined />, label: <Link to="/contact-book">Sổ liên lạc</Link> },
      { key: '/class-life', icon: <FormOutlined />, label: <Link to="/class-life">Sinh hoạt lớp</Link> },
      { key: '/appointments', icon: <CalendarOutlined />, label: <Link to="/appointments">Lịch hẹn phụ huynh</Link> },
      { key: '/library', icon: <BookOutlined />, label: <Link to="/library">Mượn sách</Link> },
    ],
  };

  const roleMenus = [...(maps[role] || [])];
  if (canManageRoles(user) && !roleMenus.some((i) => i.key === '/roles')) {
    roleMenus.unshift(rolesItem);
  }

  const studentDocumentsItem = { key: '/student-documents', icon: <FileTextOutlined />, label: <Link to="/student-documents">Hồ sơ học sinh</Link> };
  const lessonPlansItem = { key: '/lesson-plans', icon: <FileDoneOutlined />, label: <Link to="/lesson-plans">Giáo án</Link> };
  const payrollItem = { key: '/payroll', icon: <DollarOutlined />, label: <Link to="/payroll">Bảng lương</Link> };
  const equipmentItem = { key: '/equipment-maintenance', icon: <ToolOutlined />, label: <Link to="/equipment-maintenance">Bảo trì thiết bị</Link> };
  const monitoringItem = { key: '/monitoring', icon: <CloudServerOutlined />, label: <Link to="/monitoring">Giám sát hệ thống</Link> };
  const comparisonItem = { key: '/school-comparison', icon: <BankOutlined />, label: <Link to="/school-comparison">Đối chiếu liên trường</Link> };
  const catalog = [...roleMenus, lessonPlansItem, studentDocumentsItem, payrollItem, equipmentItem, monitoringItem, comparisonItem, { key: '/jobs', icon: <CloudServerOutlined />, label: <Link to="/jobs">Tác vụ nền</Link> }, ...Object.values(maps).flat(), ...common];
  const unique = new Map();
  for (const item of catalog) if (!unique.has(item.key)) unique.set(item.key, item);
  return [...unique.values()].filter(item => canVisit(user, item.key));
};

const AppLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const contentRef = useRef(null);
  const { user } = useSelector((s) => s.auth);
  const appName = useSelector((s) => s.auth.appName) || 'EduMoet';
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const compactNavigation = !screens.lg;

  const isDashboard = location.pathname === '/dashboard';
  const items = useMemo(() => dashboardMenuByRole(user?.role, user), [user]);
  const selectableItems = items.flatMap((item) => item.children || [item]);
  const selectedItem = selectableItems.find((item) => location.pathname.startsWith(item.key));
  const selected = selectedItem?.key || '/dashboard';
  const selectedGroup = items.find((item) => item.children?.some((child) => child.key === selected));
  const defaultOpenGroup = selectedGroup?.key || items.find((item) => item.children)?.key;
  const [openMenuGroups, setOpenMenuGroups] = useState(() => (defaultOpenGroup ? [defaultOpenGroup] : []));
  const pageMetadata = getPageMetadata(location.pathname);

  useEffect(() => {
    if (defaultOpenGroup) setOpenMenuGroups([defaultOpenGroup]);
  }, [defaultOpenGroup, location.pathname]);

  useLayoutEffect(() => {
    contentRef.current?.scrollTo({ top: 0, left: 0 });
    window.scrollTo({ top: 0, left: 0 });
    setMobileMenuOpen(false);
  }, [location.pathname, location.search, location.hash]);

  const navigationMenu = (
    <Menu className="app-dashboard-menu" mode="inline" selectedKeys={[selected]} openKeys={openMenuGroups} onOpenChange={setOpenMenuGroups} items={items} forceSubMenuRender onClick={() => setMobileMenuOpen(false)} />
  );

  const dashboardScope = user?.role === ROLES.SUPER_ADMIN
    ? 'Toàn hệ thống'
    : user?.role === ROLES.CLUSTER_ADMIN
      ? user?.clusterId?.name || 'Cụm trường'
      : user?.schoolId?.name || 'Nhà trường';
  const accountMenu = {
    items: [
      { key: 'profile', label: 'Thông tin cá nhân', icon: <UserOutlined /> },
      { key: 'logout', label: 'Đăng xuất', icon: <LogoutOutlined /> },
    ],
    onClick: ({ key }) => {
      if (key === 'profile') navigate('/profile');
      if (key === 'logout') {
        dispatch(logout());
        navigate('/login');
      }
    },
  };

  return (
    <Layout className={`app-shell app-shell-figma${isDashboard ? ' app-shell-dashboard' : ''}`}>
      {!compactNavigation && (
        <Sider
          className="app-sider"
          theme="light"
          width={250}
        >
          <nav aria-label="Điều hướng chính">{navigationMenu}</nav>
        </Sider>
      )}
      <Drawer
        className="app-mobile-drawer"
        title={appName}
        placement="left"
        width={280}
        open={compactNavigation && mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        styles={{ body: { padding: 0, overflowY: 'auto' } }}
      >
        <nav aria-label="Điều hướng chính">{navigationMenu}</nav>
      </Drawer>
      <Layout className="app-main-layout">
        <Header className="app-header dashboard-app-header">
          <div className="dashboard-header-content">
              <div className="dashboard-header-left">
                {compactNavigation && <Button aria-label="Mở menu điều hướng" icon={<MenuOutlined />} onClick={() => setMobileMenuOpen(true)} />}
                <div className="dashboard-wordmark" aria-label={appName}>
                  <span className="dashboard-brand-mark"><img src={brandLeafTeal} alt="" /><img src={brandLeafAmber} alt="" /></span>
                  <strong>{appName}</strong>
                </div>
                {!compactNavigation && <span className="dashboard-header-divider" aria-hidden="true" />}
                <div className="dashboard-scope-pill" aria-label="Phạm vi hiện tại">
                  <span className="dashboard-scope-icon" aria-hidden="true">⌂</span>
                  <span className="dashboard-scope-copy"><strong>{dashboardScope}</strong><small>Phạm vi hiện tại · {getSchoolYear()}</small></span>
                </div>
              </div>
              <div className="dashboard-header-actions">
                <Tooltip title="Thông báo" placement="bottom">
                  <Button className="dashboard-notification-button" aria-label="Thông báo" onClick={() => navigate('/announcements')}>
                    <BellOutlined aria-hidden="true" />
                  </Button>
                </Tooltip>
                <Dropdown menu={accountMenu} trigger={['click']} placement="bottomRight">
                  <button className="dashboard-account-button" type="button" title="Mở menu tài khoản">
                    <span className="dashboard-account-avatar"><img src={accountAvatar} alt="" /><span aria-hidden="true">{getInitials(user?.name)}</span></span>
                    <span className="dashboard-account-details"><strong>{user?.name || 'Người dùng'}</strong><small>{user?.roleLabel || ROLE_LABELS[user?.role] || user?.role}</small></span>
                    <DownOutlined aria-hidden="true" />
                  </button>
                </Dropdown>
              </div>
          </div>
        </Header>
        <Content
          ref={contentRef}
          className={`app-content${isDashboard ? ' app-dashboard-content' : ''}`}
        >
          <div className={`app-content-panel${isDashboard ? ' app-dashboard-panel' : ''}`}>
            <div className="app-route-frame">
              {pageMetadata && !isDashboard && <PageHeader title={pageMetadata.title} />}
              <div className="app-route-content">
                <Outlet />
              </div>
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
