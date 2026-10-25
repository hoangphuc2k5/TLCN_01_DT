import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Layout, Menu, Typography, Button, Avatar, Space, Badge, theme, Drawer, Grid } from 'antd';
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
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
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
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const compactNavigation = !screens.lg;

  const items = useMemo(() => menuByRole(user?.role, user), [user]);

  const selected = items.find((i) => location.pathname.startsWith(i.key))?.key || '/dashboard';

  useLayoutEffect(() => {
    contentRef.current?.scrollTo({ top: 0, left: 0 });
    window.scrollTo({ top: 0, left: 0 });
    setMobileMenuOpen(false);
  }, [location.pathname, location.search, location.hash]);

  const navigationMenu = (
    <Menu mode="inline" selectedKeys={[selected]} items={items} onClick={() => setMobileMenuOpen(false)} />
  );

  return (
    <Layout className="app-shell">
      {!compactNavigation && (
        <Sider
          className="app-sider"
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          theme="light"
          width={240}
          style={{ borderRight: `1px solid ${token.colorBorderSecondary}` }}
        >
          <div
            className="app-brand"
            style={{ cursor: 'pointer' }}
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
            <Typography.Title level={collapsed ? 5 : 4} style={{ margin: 0, color: '#0f4c5c' }}>
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
        <Header
          className="app-header"
          style={{
            background: '#fff',
            padding: compactNavigation ? '0 12px' : '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Space size={compactNavigation ? 8 : 16} className="app-header-leading">
            {compactNavigation && (
              <Button
                aria-label="Mở menu điều hướng"
                icon={<MenuOutlined />}
                onClick={() => setMobileMenuOpen(true)}
              />
            )}
            <Typography.Text className="app-role-label" strong>
              {user?.roleLabel || ROLE_LABELS[user?.role] || user?.role}
              {user?.schoolId?.name ? ` · ${user.schoolId.name}` : ''}
            </Typography.Text>
          </Space>
          <Space size={compactNavigation ? 8 : 16}>
            <span
              className="app-user-chip"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
              onClick={() => navigate('/profile')}
              title="Thông tin tài khoản"
            >
              <Badge dot>
                <Avatar icon={<UserOutlined />} src={user?.avatar || undefined} />
              </Badge>
              <span className="app-user-name">{user?.name}</span>
            </span>
            <Button
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
        <Content
          ref={contentRef}
          className="app-content"
          style={{ margin: compactNavigation ? 12 : 24 }}
        >
          <div
            className="app-content-panel"
            style={{
              background: '#fff',
              padding: compactNavigation ? 12 : 24,
              minHeight: 360,
              borderRadius: 12,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
