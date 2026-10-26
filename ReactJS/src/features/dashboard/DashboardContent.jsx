import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  List,
  Progress,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  ApartmentOutlined,
  BankOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  DollarCircleOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  FormOutlined,
  ReadOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { canVisit } from '../../utils/permissions';

const { Text, Title } = Typography;

const STAT_ICONS = {
  schools: BankOutlined,
  clusters: ApartmentOutlined,
  users: TeamOutlined,
  teachers: TeamOutlined,
  students: UserOutlined,
  classes: ReadOutlined,
  attendanceSessions: CalendarOutlined,
  gradeSheets: FormOutlined,
  pendingLeave: FileTextOutlined,
  unpaid: DollarCircleOutlined,
  paid: CheckSquareOutlined,
  overdue: DollarCircleOutlined,
  systemAnnouncements: FileDoneOutlined,
  books: BookOutlined,
  loans: BookOutlined,
  facilities: ToolOutlined,
  subjects: BookOutlined,
  invoices: DollarCircleOutlined,
  children: TeamOutlined,
  grades: FormOutlined,
  leaveRequests: FileTextOutlined,
};

const ACTION_META = {
  pendingLeave: { label: 'Đơn xin nghỉ chờ duyệt', path: '/leave' },
  unpaid: { label: 'Hóa đơn chưa thanh toán', path: '/fees' },
  overdue: { label: 'Hóa đơn quá hạn', path: '/fees' },
  facilities: { label: 'Yêu cầu cơ sở vật chất chờ duyệt', path: '/facilities' },
};

const QUICK_LINKS = {
  SUPER_ADMIN: [
    ['/schools', 'Trường học', BankOutlined],
    ['/clusters', 'Cụm trường', ApartmentOutlined],
    ['/users', 'Người dùng', TeamOutlined],
    ['/audit-logs', 'Nhật ký hệ thống', FileTextOutlined],
  ],
  CLUSTER_ADMIN: [
    ['/schools', 'Trường trong cụm', BankOutlined],
    ['/users', 'Người dùng', TeamOutlined],
    ['/fees', 'Học phí', DollarCircleOutlined],
    ['/support', 'Hỗ trợ kỹ thuật', ToolOutlined],
  ],
  SCHOOL_ADMIN: [
    ['/classes', 'Lớp học', ReadOutlined],
    ['/attendance', 'Điểm danh', CalendarOutlined],
    ['/grades', 'Điểm số', FormOutlined],
    ['/fees', 'Học phí', DollarCircleOutlined],
  ],
  ACADEMIC_AFFAIRS: [
    ['/users', 'Học sinh và giáo viên', TeamOutlined],
    ['/classes', 'Lớp và môn học', ReadOutlined],
    ['/attendance', 'Điểm danh', CalendarOutlined],
    ['/exams', 'Thi trực tuyến', FileDoneOutlined],
  ],
  SUBJECT_TEACHER: [
    ['/classes', 'Lớp phụ trách', ReadOutlined],
    ['/attendance', 'Điểm danh', CalendarOutlined],
    ['/grades', 'Nhập điểm', FormOutlined],
    ['/assignments', 'Bài tập', FileTextOutlined],
  ],
  HOMEROOM_TEACHER: [
    ['/classes', 'Lớp chủ nhiệm', ReadOutlined],
    ['/attendance', 'Điểm danh', CalendarOutlined],
    ['/conduct', 'Hạnh kiểm', CheckSquareOutlined],
    ['/contact-book', 'Sổ liên lạc', FileTextOutlined],
  ],
  ACCOUNTANT: [
    ['/fees', 'Học phí', DollarCircleOutlined],
    ['/payroll', 'Bảng lương', TeamOutlined],
  ],
  LIBRARIAN: [
    ['/library', 'Thư viện', BookOutlined],
    ['/facilities', 'Cơ sở vật chất', ToolOutlined],
  ],
  STUDENT: [
    ['/grades', 'Kết quả học tập', FormOutlined],
    ['/attendance', 'Chuyên cần', CalendarOutlined],
    ['/assignments', 'Bài tập', FileTextOutlined],
    ['/timetable', 'Thời khóa biểu', CalendarOutlined],
  ],
  PARENT: [
    ['/grades', 'Kết quả của con', FormOutlined],
    ['/attendance', 'Chuyên cần', CalendarOutlined],
    ['/fees', 'Học phí', DollarCircleOutlined],
    ['/assignments', 'Bài tập', FileTextOutlined],
    ['/contact-book', 'Sổ liên lạc', FileTextOutlined],
  ],
};

const ACTIONABLE_STAT_KEYS = new Set(Object.keys(ACTION_META));

const getTrendRows = (attendance) => (attendance?.trend || []).slice(-7);

const formatPercent = (value) => new Intl.NumberFormat('vi-VN', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
}).format(Number(value) || 0);

const formatTrendDate = (value) => {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(date);
};

const MetricCard = ({ metric }) => {
  const Icon = STAT_ICONS[metric.key] || ApartmentOutlined;

  return (
    <Card className="dashboard-stat-card" bordered>
      <Statistic
        className="dashboard-stat-card__value"
        title={(
          <span className="dashboard-stat-card__heading">
            <span className="dashboard-stat-card__icon" aria-hidden="true"><Icon /></span>
            <Text className="dashboard-stat-card__label">{metric.label}</Text>
          </span>
        )}
        value={metric.value ?? 0}
        groupSeparator="."
      />
    </Card>
  );
};

const AttendanceTrendCard = ({ attendance }) => {
  const rows = getTrendRows(attendance);
  const width = 680;
  const height = 220;
  const left = 42;
  const right = width - 12;
  const top = 16;
  const bottom = height - 32;
  const usableHeight = bottom - top;
  const rates = rows.map((row) => (
    row.total > 0 ? ((row.present + row.late) / row.total) * 100 : null
  ));
  const points = rows.map((row, index) => {
    const rate = rates[index] ?? 85;
    const x = rows.length <= 1 ? (left + right) / 2 : left + index * ((right - left) / (rows.length - 1));
    const y = top + ((100 - Math.max(0, Math.min(100, rate))) / 100) * usableHeight;
    return { x, y, rate, row };
  });
  const latestRate = attendance?.attendanceRate;

  return (
    <Card
      className="dashboard-panel dashboard-attendance-card"
      title="Thống kê chuyên cần"
      extra={latestRate != null ? <span className="dashboard-attendance-card__current">{formatPercent(latestRate)}%</span> : null}
    >
      {points.length ? (
        <figure className="dashboard-trend" aria-label="Biểu đồ tỷ lệ chuyên cần trong 7 ngày gần nhất">
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Xu hướng chuyên cần, thang đo từ 0 đến 100 phần trăm">
            {[100, 75, 50, 25, 0].map((tick) => {
              const y = top + ((100 - tick) / 100) * usableHeight;
              return (
                <g key={tick}>
                  <line x1={left} y1={y} x2={right} y2={y} className="dashboard-trend__grid" />
                  <text x="0" y={y + 4} className="dashboard-trend__axis-label">{tick}%</text>
                </g>
              );
            })}
            {points.length > 1 ? (
              <polyline
                points={points.map((point) => `${point.x},${point.y}`).join(' ')}
                className="dashboard-trend__line"
              />
            ) : null}
            {points.map((point, index) => (
              <circle
                key={point.row.date || index}
                cx={point.x}
                cy={point.y}
                r={index === points.length - 1 ? 5 : 4}
                className={index === points.length - 1 ? 'dashboard-trend__point dashboard-trend__point--latest' : 'dashboard-trend__point'}
              />
            ))}
          </svg>
          <div className="dashboard-trend__dates" style={{ '--trend-count': points.length }}>
            {points.map((point, index) => (
              <span key={point.row.date || index}>{formatTrendDate(point.row.date)}</span>
            ))}
          </div>
          <figcaption className="dashboard-trend__caption">
            {points.length} ngày có ghi nhận · dữ liệu theo phạm vi tài khoản
          </figcaption>
        </figure>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu chuyên cần" />
      )}
    </Card>
  );
};

const FeesSummaryCard = ({ fees, money }) => (
  <Card className="dashboard-panel" title="Thống kê học phí">
    <div className="dashboard-fees-summary">
      <Statistic
        title="Đã thu"
        value={fees.paid || 0}
        formatter={() => money(fees.paid)}
      />
      <Text type="secondary">trên {money(fees.billed)} phải thu</Text>
    </div>
    <Progress percent={Math.max(0, Math.min(100, fees.collectionRate || 0))} />
    <Text className="dashboard-panel__support" type="secondary">
      Còn phải thu: {money(fees.outstanding)} · {fees.invoiceCount || 0} hóa đơn
    </Text>
  </Card>
);

const GradeSummaryCard = ({ grades }) => (
  <Card className="dashboard-panel" title="Thống kê học tập">
    <div className="dashboard-grade-summary">
      <Statistic title="Điểm trung bình" value={grades.average ?? '—'} precision={grades.average == null ? undefined : 1} />
      <Text type="secondary">{grades.scoredCount || 0} trên {grades.sheetCount || 0} bảng điểm đã có điểm</Text>
    </div>
    <List
      className="dashboard-grade-distribution"
      size="small"
      dataSource={grades.distribution || []}
      renderItem={(item) => (
        <List.Item>
          <Text>{item.label}</Text>
          <Tag>{item.value}</Tag>
        </List.Item>
      )}
    />
  </Card>
);

const AssignmentSummaryCard = ({ assignments }) => (
  <Card className="dashboard-panel" title="Thống kê bài tập">
    <Row gutter={[12, 12]} className="dashboard-assignment-stats">
      {[
        ['Bài tập', assignments.assignments],
        ['Đã nộp', assignments.submitted],
        ['Đã chấm', assignments.graded],
      ].map(([label, value]) => (
        <Col span={8} key={label}>
          <Statistic title={label} value={value || 0} />
        </Col>
      ))}
    </Row>
    {assignments.pendingUploads ? (
      <Alert className="dashboard-assignment-alert" type="warning" showIcon message={`${assignments.pendingUploads} bài đang tải tệp`} />
    ) : null}
  </Card>
);

const SchoolListCard = ({ schools, navigate }) => (
  <Card
    className="dashboard-panel"
    title="Trường trong cụm"
    extra={<Button type="link" onClick={() => navigate('/schools')}>Xem tất cả</Button>}
  >
    {schools?.length ? (
      <List
        dataSource={schools.slice(0, 5)}
        renderItem={(school) => (
          <List.Item>
            <div className="dashboard-school-row">
              <Text strong>{school.name}</Text>
              <Text type="secondary">{school.code}</Text>
            </div>
            <Tag color={school.status === 'ACTIVE' ? 'green' : 'default'}>{school.status === 'ACTIVE' ? 'Đang hoạt động' : school.status}</Tag>
          </List.Item>
        )}
      />
    ) : (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có trường trong cụm" />
    )}
  </Card>
);

const AttentionCard = ({ stats, user, navigate }) => {
  const actions = (stats || [])
    .filter((stat) => ACTIONABLE_STAT_KEYS.has(stat.key) && Number(stat.value) > 0)
    .map((stat) => ({ ...ACTION_META[stat.key], ...stat }))
    .filter((action) => canVisit(user, action.path));

  return (
    <Card className="dashboard-panel dashboard-attention-card" title="Cần quan tâm">
      {actions.length ? (
        <List
          dataSource={actions}
          renderItem={(action) => (
            <List.Item
              actions={[
                <Button key="open" type="link" onClick={() => navigate(action.path)}>
                  Mở
                </Button>,
              ]}
            >
              <div className="dashboard-attention-row">
                <span className="dashboard-attention-row__marker" aria-hidden="true" />
                <div className="dashboard-attention-row__copy">
                  <Text strong>{action.label}</Text>
                  <Text type="secondary">{action.value} mục</Text>
                </div>
              </div>
            </List.Item>
          )}
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có mục cần xử lý" />
      )}
    </Card>
  );
};

const QuickAccessCard = ({ role, user, navigate }) => {
  const links = (QUICK_LINKS[role] || [])
    .filter(([path]) => canVisit(user, path));

  if (!links.length) return null;

  return (
    <Card className="dashboard-panel dashboard-quick-access" title="Truy cập nhanh">
      <div className="dashboard-quick-access__links">
        {links.map(([path, label, Icon]) => (
          <Button key={path} className="dashboard-quick-link" onClick={() => navigate(path)}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </Button>
        ))}
      </div>
    </Card>
  );
};

const DashboardContent = ({
  data,
  analytics,
  money,
  user,
  invoiceColumns,
  gradeColumns,
  navigate,
}) => {
  const stats = data?.stats || [];
  const role = user?.role;
  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());
  const primaryAnalytics = analytics?.attendance
    ? 'attendance'
    : analytics?.fees
      ? 'fees'
      : analytics?.grades
        ? 'grades'
        : analytics?.assignments
          ? 'assignments'
          : null;

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <div className="dashboard-breadcrumb"><span>EduMoet</span><span aria-hidden="true">›</span><span>Tổng quan</span></div>
          <Title level={1} className="dashboard-heading__title">{data?.title || 'Tổng quan'}</Title>
          <Text className="dashboard-heading__date" type="secondary">{today}</Text>
        </div>
      </div>

      {stats.length ? (
        <Row gutter={[14, 14]} className="dashboard-stat-grid">
          {stats.map((metric) => (
            <Col xs={24} sm={12} xl={stats.length > 4 ? 8 : 6} key={metric.key}>
              <MetricCard metric={metric} />
            </Col>
          ))}
        </Row>
      ) : (
        <Card className="dashboard-empty-card"><Empty description="Chưa có số liệu tổng quan" /></Card>
      )}

      <Row gutter={[16, 16]} className="dashboard-primary-grid">
        <Col xs={24} xl={15}>
          {primaryAnalytics === 'attendance' ? <AttendanceTrendCard attendance={analytics.attendance} /> : null}
          {primaryAnalytics === 'fees' ? <FeesSummaryCard fees={analytics.fees} money={money} /> : null}
          {primaryAnalytics === 'grades' ? <GradeSummaryCard grades={analytics.grades} /> : null}
          {primaryAnalytics === 'assignments' ? <AssignmentSummaryCard assignments={analytics.assignments} /> : null}
          {!primaryAnalytics && data?.schools ? <SchoolListCard schools={data.schools} navigate={navigate} /> : null}
        </Col>
        <Col xs={24} xl={9}>
          <AttentionCard stats={stats} user={user} navigate={navigate} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="dashboard-secondary-grid">
        {analytics?.attendance && primaryAnalytics !== 'attendance' ? (
          <Col xs={24} lg={12}><AttendanceTrendCard attendance={analytics.attendance} /></Col>
        ) : null}
        {analytics?.fees && primaryAnalytics !== 'fees' ? (
          <Col xs={24} lg={12}><FeesSummaryCard fees={analytics.fees} money={money} /></Col>
        ) : null}
        {analytics?.grades && primaryAnalytics !== 'grades' ? (
          <Col xs={24} lg={12}><GradeSummaryCard grades={analytics.grades} /></Col>
        ) : null}
        {analytics?.assignments && primaryAnalytics !== 'assignments' ? (
          <Col xs={24} lg={12}><AssignmentSummaryCard assignments={analytics.assignments} /></Col>
        ) : null}
        {data?.schools && primaryAnalytics ? (
          <Col xs={24} lg={12}><SchoolListCard schools={data.schools} navigate={navigate} /></Col>
        ) : null}
      </Row>

      {data?.invoices?.length ? (
        <Card
          className="dashboard-panel dashboard-data-table"
          title="Học phí và hóa đơn gần đây"
          extra={<Button type="link" onClick={() => navigate('/fees')}>Xem tất cả</Button>}
        >
          <Table
            dataSource={data.invoices}
            columns={invoiceColumns}
            rowKey="_id"
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
          />
        </Card>
      ) : null}

      {data?.grades?.length ? (
        <Card
          className="dashboard-panel dashboard-data-table"
          title="Kết quả học tập gần đây"
          extra={<Button type="link" onClick={() => navigate('/grades')}>Xem kết quả</Button>}
        >
          <Table
            dataSource={data.grades}
            columns={gradeColumns}
            rowKey="_id"
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
          />
        </Card>
      ) : null}

      <QuickAccessCard role={role} user={user} navigate={navigate} />
    </div>
  );
};

export default DashboardContent;
