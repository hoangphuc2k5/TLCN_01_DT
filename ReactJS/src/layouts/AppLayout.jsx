import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Layout, Menu, Typography, Button, Avatar, Space, Badge, Drawer, Grid, Dropdown } from 'antd';
import {
  DashboardOutlined,
  BankOutlined,
  TeamOutlined,
  ReadOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  FormOutlined,
  DollarOutlined,
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
import logo from '../Logo/icon.png';
import notificationIcon from '../features/dashboard/assets/figma/notification-outline.svg';
import notificationDot from '../features/dashboard/assets/figma/notification-dot.svg';
import accountAvatar from '../features/dashboard/assets/figma/account-avatar.svg';
import brandLeafTeal from '../features/dashboard/assets/figma/brand-leaf-teal.svg';
import brandLeafAmber from '../features/dashboard/assets/figma/brand-leaf-amber.svg';
import navDot from '../features/dashboard/assets/figma/nav-dot.svg';
import navDotActive from '../features/dashboard/assets/figma/nav-dot-active.svg';

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

const dashboardMenuByRole = (role, user) => (dashboardNavByRole[role] || []).map(([label, entries]) => ({
  type: 'group',
  label,
  children: entries.filter(([, path]) => canVisit(user, path)).map(([title, path]) => ({
    key: path,
    icon: <span className="dashboard-menu-dot" aria-hidden="true"><img src={navDot} alt="" /><img src={navDotActive} alt="" /></span>,
    label: <Link to={path}>{title}</Link>,
  })),
})).filter((group) => group.children.length);

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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const contentRef = useRef(null);
  const { user } = useSelector((s) => s.auth);
  const appName = useSelector((s) => s.auth.appName) || 'EduMoet';
  const shortName = appName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'EM';
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const compactNavigation = !screens.lg;

  const isDashboard = location.pathname === '/dashboard';
  const items = useMemo(() => (isDashboard ? dashboardMenuByRole(user?.role, user) : menuByRole(user?.role, user)), [isDashboard, user]);

  const selected = items.find((i) => location.pathname.startsWith(i.key))?.key || '/dashboard';
  const pageMetadata = getPageMetadata(location.pathname);

  useLayoutEffect(() => {
    contentRef.current?.scrollTo({ top: 0, left: 0 });
    window.scrollTo({ top: 0, left: 0 });
    setMobileMenuOpen(false);
  }, [location.pathname, location.search, location.hash]);

  const navigationMenu = (
    <Menu className={isDashboard ? 'app-dashboard-menu' : undefined} mode="inline" selectedKeys={[selected]} items={items} onClick={() => setMobileMenuOpen(false)} />
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
    <Layout className={`app-shell${isDashboard ? ' app-shell-dashboard' : ''}`}>
      {!compactNavigation && (
        <Sider
          className="app-sider"
          collapsible={!isDashboard}
          collapsed={isDashboard ? false : collapsed}
          onCollapse={setCollapsed}
          theme="light"
          width={isDashboard ? 250 : 240}
        >
          <div
            className="app-brand"
            onClick={() => navigate('/profile')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate('/profile');
            }}
            title="Thông tin tài khoản"
          >
            <img
              src={logo}
              alt={`Logo ${appName}`}
              style={{
                width: collapsed ? 40 : 56,
                height: collapsed ? 40 : 56,
                objectFit: 'contain',
                marginBottom: collapsed ? 0 : 8,
              }}
            />
            <Typography.Title level={collapsed ? 5 : 4} className="app-brand-title" style={{ margin: 0 }}>
              {collapsed ? shortName : appName}
            </Typography.Title>
            {!collapsed && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Quản lý đa trường
              </Typography.Text>
            )}
          </div>
          {navigationMenu}
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
        {navigationMenu}
      </Drawer>
      <Layout className="app-main-layout">
        <Header className={`app-header${isDashboard ? ' dashboard-app-header' : ''}`}>
          {isDashboard ? (
            <div className="dashboard-header-content">
              <div className="dashboard-header-left">
                {compactNavigation && <Button aria-label="Mở menu điều hướng" icon={<MenuOutlined />} onClick={() => setMobileMenuOpen(true)} />}
                <div className="dashboard-wordmark" aria-label={appName}>
                  <span className="dashboard-brand-mark"><img src={brandLeafTeal} alt="" /><img src={brandLeafAmber} alt="" /></span>
                  <strong>{appName}</strong>
                </div>
                {!compactNavigation && <span className="dashboard-header-divider" aria-hidden="true" />}
                <div className="dashboard-scope-pill">
                  <span className="dashboard-scope-icon" aria-hidden="true">⌂</span>
                  <span className="dashboard-scope-copy"><strong>{dashboardScope}</strong><small>{getSchoolYear()}</small></span>
                  {!compactNavigation && <DownOutlined className="dashboard-scope-chevron" />}
                </div>
              </div>
              <div className="dashboard-header-actions">
                <Button className="dashboard-notification-button" aria-label="Mở thông báo" onClick={() => navigate('/announcements')}>
                  <img src={notificationIcon} alt="" />
                  <img className="dashboard-notification-dot" src={notificationDot} alt="" />
                </Button>
                <Dropdown menu={accountMenu} trigger={['click']} placement="bottomRight">
                  <button className="dashboard-account-button" type="button" aria-label="Mở menu tài khoản">
                    <span className="dashboard-account-avatar"><img src={accountAvatar} alt="" /><span>{getInitials(user?.name)}</span></span>
                    <DownOutlined />
                  </button>
                </Dropdown>
              </div>
            </div>
          ) : (
            <>
              <Space size={compactNavigation ? 8 : 16} className="app-header-leading">
                {compactNavigation && <Button aria-label="Mở menu điều hướng" icon={<MenuOutlined />} onClick={() => setMobileMenuOpen(true)} />}
                <Typography.Text className="app-role-label" strong>
                  {user?.roleLabel || ROLE_LABELS[user?.role] || user?.role}
                  {user?.schoolId?.name ? ` · ${user.schoolId.name}` : ''}
                </Typography.Text>
              </Space>
              <Space size={compactNavigation ? 8 : 16}>
                <span className="app-user-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/profile')} title="Thông tin tài khoản">
                  <Badge dot><Avatar icon={<UserOutlined />} src={user?.avatar || undefined} /></Badge>
                  <span className="app-user-name">{user?.name}</span>
                </span>
                <Button icon={<LogoutOutlined />} aria-label="Đăng xuất" onClick={() => { dispatch(logout()); navigate('/login'); }} className="app-logout-button">
                  <span className="app-logout-label">Đăng xuất</span>
                </Button>
              </Space>
            </>
          )}
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
