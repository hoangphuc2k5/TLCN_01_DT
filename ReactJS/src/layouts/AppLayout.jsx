import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Layout, Menu, Typography, Button, Avatar, Space, Drawer, Grid } from 'antd';
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
  BellOutlined,
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
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import PageHeader from '../components/layout/PageHeader';
import { getPageMetadata } from '../constants/page-metadata';
import { logout } from '../store/auth.slice';
import { ROLES, ROLE_LABELS } from '../constants/roles';
import { canVisit } from '../utils/permissions';
import logo from '../Logo/icon.png';

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

const menuGroupForPath = (path) => {
  if (path === '/dashboard' || path === '/profile') return 'CHUNG';
  if (['/attendance', '/grades', '/exams', '/materials', '/assignments', '/lesson-plans', '/timetable', '/student-documents'].includes(path)) return 'HỌC TẬP';
  if (['/fees', '/payroll', '/subscriptions'].includes(path)) return 'TÀI CHÍNH';
  if (['/announcements', '/messages', '/calendar', '/leave', '/contact-book', '/class-life', '/appointments'].includes(path)) return 'LIÊN LẠC';
  if (['/clusters', '/schools', '/users', '/roles', '/templates', '/audit-logs', '/monitoring', '/jobs', '/school-comparison', '/support'].includes(path)) return 'QUẢN TRỊ';
  if (['/classes', '/library', '/facilities', '/equipment-maintenance', '/conduct', '/rewards', '/admissions', '/activities'].includes(path)) return 'NGHIỆP VỤ';
  return 'KHÁC';
};

const groupMenuItems = (items) => {
  const groups = new Map();
  items.forEach((item) => {
    const label = menuGroupForPath(item.key);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(item);
  });

  const order = ['CHUNG', 'HỌC TẬP', 'TÀI CHÍNH', 'LIÊN LẠC', 'NGHIỆP VỤ', 'QUẢN TRỊ', 'KHÁC'];
  return order
    .filter((label) => groups.has(label))
    .map((label) => ({ key: `group-${label}`, type: 'group', label, children: groups.get(label) }));
};

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

  const items = useMemo(() => menuByRole(user?.role, user), [user]);
  const groupedItems = useMemo(() => groupMenuItems(items), [items]);

  const selected = items
    .filter((item) => item.key !== '/dashboard')
    .sort((a, b) => b.key.length - a.key.length)
    .find((item) => location.pathname === item.key || location.pathname.startsWith(`${item.key}/`))?.key
    || (location.pathname === '/dashboard' ? '/dashboard' : undefined);
  const pageMetadata = getPageMetadata(location.pathname);
  const roleLabel = user?.roleLabel || ROLE_LABELS[user?.role] || user?.role || '';
  const organizationName = user?.schoolId?.name
    || user?.clusterId?.name
    || (user?.role === ROLES.SUPER_ADMIN ? 'Toàn hệ thống' : roleLabel);

  useLayoutEffect(() => {
    contentRef.current?.scrollTo({ top: 0, left: 0 });
    window.scrollTo({ top: 0, left: 0 });
    setMobileMenuOpen(false);
  }, [location.pathname, location.search, location.hash]);

  const navigationMenu = (
    <Menu
      mode="inline"
      selectedKeys={selected ? [selected] : []}
      items={groupedItems}
      onClick={() => setMobileMenuOpen(false)}
    />
  );

  return (
    <Layout className="app-shell">
      <Header className="app-header">
        <div className="app-header-leading">
          {compactNavigation && (
            <Button
              className="app-menu-toggle"
              aria-label="Mở menu điều hướng"
              icon={<MenuOutlined />}
              onClick={() => setMobileMenuOpen(true)}
            />
          )}
          <div className="app-header-brand" aria-label={appName}>
            <img src={logo} alt="" className="app-header-logo" />
            <Typography.Text className="app-header-brand-name" strong>{appName}</Typography.Text>
          </div>
          <span className="app-header-divider" aria-hidden="true" />
          <div className="app-header-context" title={organizationName}>
            <BankOutlined aria-hidden="true" />
            <span className="app-header-context-copy">
              <Typography.Text className="app-header-context-name" strong>{organizationName}</Typography.Text>
              <Typography.Text className="app-header-context-role" type="secondary">{roleLabel}</Typography.Text>
            </span>
          </div>
        </div>
        <Space size={compactNavigation ? 4 : 12} className="app-header-actions">
          <Button
            className="app-header-icon-button"
            type="text"
            aria-label="Mở thông báo"
            title="Thông báo"
            icon={<BellOutlined />}
            onClick={() => navigate('/announcements')}
          />
          <Button
            type="text"
            className="app-profile-button"
            aria-label="Thông tin tài khoản"
            title="Thông tin tài khoản"
            onClick={() => navigate('/profile')}
          >
            <Avatar icon={<UserOutlined />} src={user?.avatar || undefined} />
            <span className="app-user-name">{user?.name}</span>
          </Button>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            aria-label="Đăng xuất"
            onClick={() => {
              dispatch(logout());
              navigate('/login');
            }}
            className="app-logout-button"
          >
            <span className="app-logout-label">Đăng xuất</span>
          </Button>
        </Space>
      </Header>
      <Layout className="app-body">
        {!compactNavigation && (
          <Sider
            className="app-sider"
            theme="light"
            width={248}
          >
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
          <Content ref={contentRef} className="app-content">
            <div className={`app-content-panel${location.pathname === '/dashboard' ? ' app-content-panel--dashboard' : ''}`}>
              <div className={`app-route-frame${location.pathname === '/dashboard' ? ' app-route-frame--dashboard' : ''}`}>
                {pageMetadata && <PageHeader title={pageMetadata.title} />}
                <div className="app-route-content">
                  <Outlet />
                </div>
              </div>
            </div>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
