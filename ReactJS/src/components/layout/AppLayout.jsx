import { useMemo, useState } from 'react';
import { Layout, Menu, Typography, Button, Avatar, Space, Badge, theme } from 'antd';
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
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../Redux/authSlice';
import { ROLES, ROLE_LABELS } from '../../constants/roles';

const { Header, Sider, Content } = Layout;

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
      { key: '/support', icon: <CustomerServiceOutlined />, label: <Link to="/support">Hỗ trợ</Link> },
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
      { key: '/conduct', icon: <SmileOutlined />, label: <Link to="/conduct">Hạnh kiểm</Link> },
      { key: '/templates', icon: <FileDoneOutlined />, label: <Link to="/templates">Mẫu dùng chung</Link> },
      { key: '/support', icon: <CustomerServiceOutlined />, label: <Link to="/support">Hỗ trợ KT</Link> },
      { key: '/audit-logs', icon: <AuditOutlined />, label: <Link to="/audit-logs">Nhật ký</Link> },
    ],
    [ROLES.ACADEMIC_AFFAIRS]: [
      { key: '/users', icon: <TeamOutlined />, label: <Link to="/users">Học sinh/GV</Link> },
      { key: '/classes', icon: <ReadOutlined />, label: <Link to="/classes">Lớp & môn</Link> },
      { key: '/attendance', icon: <CheckSquareOutlined />, label: <Link to="/attendance">Điểm danh</Link> },
      { key: '/exams', icon: <ExperimentOutlined />, label: <Link to="/exams">Thi online</Link> },
      { key: '/materials', icon: <BookOutlined />, label: <Link to="/materials">Học liệu</Link> },
      { key: '/facilities', icon: <ToolOutlined />, label: <Link to="/facilities">Phòng/TB</Link> },
    ],
    [ROLES.SUBJECT_TEACHER]: [
      { key: '/classes', icon: <ReadOutlined />, label: <Link to="/classes">Lớp phụ trách</Link> },
      { key: '/attendance', icon: <CheckSquareOutlined />, label: <Link to="/attendance">Điểm danh</Link> },
      { key: '/grades', icon: <FormOutlined />, label: <Link to="/grades">Nhập điểm</Link> },
      { key: '/exams', icon: <ExperimentOutlined />, label: <Link to="/exams">Thi online</Link> },
      { key: '/materials', icon: <BookOutlined />, label: <Link to="/materials">Học liệu</Link> },
      { key: '/facilities', icon: <ToolOutlined />, label: <Link to="/facilities">Mượn phòng/TB</Link> },
    ],
    [ROLES.HOMEROOM_TEACHER]: [
      { key: '/classes', icon: <ReadOutlined />, label: <Link to="/classes">Lớp chủ nhiệm</Link> },
      { key: '/attendance', icon: <CheckSquareOutlined />, label: <Link to="/attendance">Điểm danh</Link> },
      { key: '/grades', icon: <FormOutlined />, label: <Link to="/grades">Điểm số</Link> },
      { key: '/conduct', icon: <SmileOutlined />, label: <Link to="/conduct">Hạnh kiểm</Link> },
      { key: '/exams', icon: <ExperimentOutlined />, label: <Link to="/exams">Thi online</Link> },
      { key: '/materials', icon: <BookOutlined />, label: <Link to="/materials">Học liệu</Link> },
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
      { key: '/library', icon: <BookOutlined />, label: <Link to="/library">Thư viện</Link> },
      { key: '/conduct', icon: <SmileOutlined />, label: <Link to="/conduct">Hạnh kiểm</Link> },
    ],
    [ROLES.PARENT]: [
      { key: '/grades', icon: <FormOutlined />, label: <Link to="/grades">Điểm con</Link> },
      { key: '/attendance', icon: <CheckSquareOutlined />, label: <Link to="/attendance">Điểm danh</Link> },
      { key: '/fees', icon: <DollarOutlined />, label: <Link to="/fees">Học phí</Link> },
      { key: '/exams', icon: <ExperimentOutlined />, label: <Link to="/exams">Kết quả thi</Link> },
      { key: '/conduct', icon: <SmileOutlined />, label: <Link to="/conduct">Hạnh kiểm</Link> },
      { key: '/library', icon: <BookOutlined />, label: <Link to="/library">Mượn sách</Link> },
    ],
  };

  const roleMenus = [...(maps[role] || [])];
  if (canManageRoles(user) && !roleMenus.some((i) => i.key === '/roles')) {
    roleMenus.unshift(rolesItem);
  }

  return [...roleMenus, ...common];
};

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
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

  const items = useMemo(() => menuByRole(user?.role, user), [user]);

  const selected = items.find((i) => location.pathname.startsWith(i.key))?.key || '/dashboard';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        width={240}
        style={{ borderRight: `1px solid ${token.colorBorderSecondary}` }}
      >
        <div
          style={{ padding: 16, textAlign: 'center', cursor: 'pointer' }}
          onClick={() => navigate('/profile')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') navigate('/profile');
          }}
          title="Thông tin tài khoản"
        >
          <Typography.Title level={collapsed ? 5 : 4} style={{ margin: 0, color: '#0f4c5c' }}>
            {collapsed ? shortName : appName}
          </Typography.Title>
          {!collapsed && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Quản lý đa trường
            </Typography.Text>
          )}
        </div>
        <Menu mode="inline" selectedKeys={[selected]} items={items} />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Typography.Text strong>
            {user?.roleLabel || ROLE_LABELS[user?.role] || user?.role}
            {user?.schoolId?.name ? ` · ${user.schoolId.name}` : ''}
          </Typography.Text>
          <Space>
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
              onClick={() => navigate('/profile')}
              title="Thông tin tài khoản"
            >
              <Badge dot>
                <Avatar icon={<UserOutlined />} src={user?.avatar || undefined} />
              </Badge>
              <span>{user?.name}</span>
            </span>
            <Button
              icon={<LogoutOutlined />}
              onClick={() => {
                dispatch(logout());
                navigate('/login');
              }}
            >
              Đăng xuất
            </Button>
          </Space>
        </Header>
        <Content style={{ margin: 24 }}>
          <div
            style={{
              background: '#fff',
              padding: 24,
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
