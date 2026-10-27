import { ROLES } from '../../constants/roles';
import {
  AppstoreOutlined,
  BankOutlined,
  BarChartOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  FormOutlined,
  NotificationOutlined,
  ReadOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import priorityDot from './assets/figma/priority-dot.svg';
import quickLinkDot from './assets/figma/quick-link-dot.svg';

const metricIcons = {
  schools: <BankOutlined />,
  users: <TeamOutlined />,
  clusters: <AppstoreOutlined />,
  systemAnnouncements: <NotificationOutlined />,
  unpaid: <DollarOutlined />,
  students: <TeamOutlined />,
  attendanceRate: <CheckCircleOutlined />,
  classes: <ReadOutlined />,
  teachers: <UserOutlined />,
  pendingLeave: <FileTextOutlined />,
  assignments: <FormOutlined />,
  attendanceSessions: <CalendarOutlined />,
  gradeSheets: <FileDoneOutlined />,
  submitted: <CheckCircleOutlined />,
  paid: <CheckCircleOutlined />,
  overdue: <ClockCircleOutlined />,
  books: <BookOutlined />,
  loans: <BookOutlined />,
  facilities: <ToolOutlined />,
  subjects: <ReadOutlined />,
  invoices: <DollarOutlined />,
  children: <TeamOutlined />,
  grades: <BarChartOutlined />,
  leaveRequests: <FileTextOutlined />,
};

const roleContent = {
  [ROLES.SUPER_ADMIN]: {
    subtitle: 'Tổng quan vận hành nền tảng',
    metrics: [
      ['schools', 'Số trường', 'trường', 'TR'],
      ['users', 'Người dùng', 'tài khoản', 'ND'],
      ['clusters', 'Cụm trường', 'cụm', 'CT'],
      ['systemAnnouncements', 'Thông báo hệ thống', 'đang hoạt động', 'TB'],
    ],
    primary: 'system', primaryTitle: 'Quy mô hệ thống', secondaryTitle: 'Tổng quan quản trị',
    highlights: [['clusters', 'Cụm trường', 'Phạm vi toàn hệ thống'], ['schools', 'Trường đang hoạt động', 'Số liệu từ hệ thống'], ['systemAnnouncements', 'Thông báo hệ thống', 'Thông tin hiện có']],
    quickLinks: [['Trường học', '/schools'], ['Cụm trường', '/clusters'], ['Tài khoản', '/users'], ['Nhật ký hệ thống', '/audit-logs']],
  },
  [ROLES.CLUSTER_ADMIN]: {
    subtitle: 'Theo dõi trường và hoạt động trong cụm',
    metrics: [['schools', 'Trường trong cụm', 'trường', 'TR'], ['users', 'Người dùng', 'tài khoản', 'ND'], ['unpaid', 'Hóa đơn cần xử lý', 'hóa đơn', 'HD']],
    primary: 'schools', primaryTitle: 'Trường trong cụm', secondaryTitle: 'Cần theo dõi',
    highlights: [['unpaid', 'Hóa đơn chưa thanh toán', 'Học phí'], ['schools', 'Trường đang quản lý', 'Theo phạm vi cụm'], ['users', 'Tài khoản', 'Được phân quyền']],
    quickLinks: [['Trường trong cụm', '/schools'], ['Tài khoản', '/users'], ['Học phí', '/fees'], ['Báo cáo', '/school-comparison']],
  },
  [ROLES.SCHOOL_ADMIN]: {
    subtitle: 'Điều hành hoạt động nhà trường',
    metrics: [['students', 'Số học sinh', 'học sinh', 'HS'], ['attendanceRate', 'Chuyên cần hôm nay', '', 'CC', 'attendance'], ['classes', 'Số lớp học', 'lớp', 'LH'], ['teachers', 'Giáo viên', 'người', 'GV']],
    primary: 'attendance', primaryTitle: 'Chuyên cần 7 ngày qua', secondaryTitle: 'Cần quan tâm',
    highlights: [['pendingLeave', 'Đơn xin nghỉ chờ duyệt', 'Đơn nghỉ phép'], ['unpaid', 'Công nợ học phí', 'Học phí'], ['teachers', 'Nhân sự toàn trường', 'Giáo viên & nhân viên']],
    quickLinks: [['Điểm danh', '/attendance'], ['Đơn xin nghỉ', '/leave'], ['Học phí', '/fees'], ['Lớp & môn', '/classes']],
  },
  [ROLES.ACADEMIC_AFFAIRS]: {
    subtitle: 'Theo dõi hồ sơ và tiến độ học vụ',
    metrics: [['students', 'Học sinh', 'học sinh', 'HS'], ['classes', 'Lớp học', 'lớp', 'LH'], ['pendingLeave', 'Đơn chờ duyệt', 'đơn', 'DX'], ['assignments', 'Bài tập', 'bài đang mở', 'BT', 'assignments']],
    primary: 'attendance', primaryTitle: 'Chuyên cần 7 ngày qua', secondaryTitle: 'Nghiệp vụ cần xử lý',
    highlights: [['pendingLeave', 'Đơn xin nghỉ chờ duyệt', 'Hồ sơ cần kiểm tra'], ['pendingUploads', 'Bài tập chờ tải lên', 'Tình trạng đồng bộ', 'assignments'], ['assignments', 'Bài tập đang mở', 'Theo dữ liệu học vụ', 'assignments']],
    quickLinks: [['Hồ sơ học sinh', '/student-documents'], ['Lớp & môn', '/classes'], ['Thi online', '/exams'], ['Bài tập', '/assignments']],
  },
  [ROLES.SUBJECT_TEACHER]: {
    subtitle: 'Công việc giảng dạy và đánh giá',
    metrics: [['attendanceSessions', 'Buổi điểm danh', 'buổi', 'DD'], ['gradeSheets', 'Bảng điểm', 'bảng', 'BD'], ['assignments', 'Bài tập', 'bài', 'BT', 'assignments'], ['submitted', 'Đã nộp', 'lượt', 'DN', 'assignments']],
    primary: 'assignments', primaryTitle: 'Tiến độ bài tập', secondaryTitle: 'Truy cập nhanh',
    highlights: [['gradeSheets', 'Bảng điểm', 'Nhập / cập nhật điểm'], ['attendanceSessions', 'Buổi điểm danh', 'Lớp được phân công'], ['assignments', 'Bài tập', 'Bài được giao', 'assignments']],
    quickLinks: [['Lớp phụ trách', '/classes'], ['Nhập điểm', '/grades'], ['Bài tập', '/assignments'], ['Học liệu', '/materials']],
  },
  [ROLES.HOMEROOM_TEACHER]: {
    subtitle: 'Theo dõi lớp chủ nhiệm và phối hợp phụ huynh',
    metrics: [['attendanceSessions', 'Buổi điểm danh', 'buổi', 'DD'], ['gradeSheets', 'Bảng điểm', 'bảng', 'BD'], ['attendanceRate', 'Chuyên cần hiện tại', '', 'CC', 'attendance'], ['assignments', 'Bài tập lớp', 'bài', 'BT', 'assignments']],
    primary: 'attendance', primaryTitle: 'Chuyên cần lớp', secondaryTitle: 'Theo dõi lớp',
    highlights: [['attendanceRate', 'Chuyên cần', 'Tỷ lệ ghi nhận', 'attendance'], ['gradeSheets', 'Bảng điểm', 'Theo dõi lớp'], ['assignments', 'Bài tập', 'Tiến độ nộp bài', 'assignments']],
    quickLinks: [['Điểm danh', '/attendance'], ['Hạnh kiểm', '/conduct'], ['Sổ liên lạc', '/contact-book'], ['Sinh hoạt lớp', '/class-life']],
  },
  [ROLES.ACCOUNTANT]: {
    subtitle: 'Theo dõi các khoản thu và công nợ',
    metrics: [['unpaid', 'Chưa thanh toán', 'hóa đơn', 'CT'], ['paid', 'Đã thanh toán', 'hóa đơn', 'DT'], ['overdue', 'Quá hạn', 'hóa đơn', 'QH']],
    primary: 'fees', primaryTitle: 'Tình hình thu học phí', secondaryTitle: 'Ưu tiên xử lý',
    highlights: [['overdue', 'Hóa đơn quá hạn', 'Cần ưu tiên rà soát'], ['unpaid', 'Chưa thanh toán', 'Theo dõi công nợ'], ['paid', 'Đã thanh toán', 'Đối soát giao dịch']],
    quickLinks: [['Học phí', '/fees'], ['Hóa đơn', '/fees'], ['Báo cáo thu', '/school-comparison'], ['Thông tin thanh toán', '/fees']],
  },
  [ROLES.LIBRARIAN]: {
    subtitle: 'Theo dõi sách, lượt mượn và yêu cầu CSVC',
    metrics: [['books', 'Đầu sách', 'đầu sách', 'DS'], ['loans', 'Đang mượn', 'lượt', 'DM'], ['facilities', 'Yêu cầu CSVC', 'chờ duyệt', 'CS']],
    primary: 'library', primaryTitle: 'Hoạt động thư viện', secondaryTitle: 'Cần xử lý',
    highlights: [['facilities', 'Yêu cầu CSVC chờ duyệt', 'Mở danh sách yêu cầu'], ['loans', 'Sách đang được mượn', 'Theo dõi hạn trả'], ['books', 'Tổng đầu sách', 'Danh mục thư viện']],
    quickLinks: [['Thư viện', '/library'], ['Mượn / trả sách', '/library'], ['Cơ sở vật chất', '/facilities'], ['Yêu cầu chờ duyệt', '/facilities']],
  },
  [ROLES.STUDENT]: {
    subtitle: 'Học tập, chuyên cần và các khoản cần theo dõi',
    metrics: [['subjects', 'Môn có điểm', 'môn', 'MH'], ['attendanceSessions', 'Buổi điểm danh', 'buổi', 'CC'], ['invoices', 'Hóa đơn', 'hóa đơn', 'HD']],
    primary: 'grades', primaryTitle: 'Kết quả học tập gần đây', secondaryTitle: 'Học phí & hóa đơn',
    quickLinks: [['Bài tập', '/assignments'], ['Thời khóa biểu', '/timetable'], ['Kết quả học tập', '/grades'], ['Học phí', '/fees']],
  },
  [ROLES.PARENT]: {
    subtitle: 'Thông tin học tập và chăm sóc con em',
    metrics: [['children', 'Con em', 'học sinh', 'CE'], ['grades', 'Bảng điểm', 'bảng', 'BD'], ['invoices', 'Hóa đơn', 'hóa đơn', 'HD'], ['leaveRequests', 'Đơn đã gửi', 'đơn', 'NP']],
    primary: 'grades', primaryTitle: 'Kết quả học tập của các con', secondaryTitle: 'Thông tin cần theo dõi',
    quickLinks: [['Điểm con', '/grades'], ['Điểm danh', '/attendance'], ['Học phí', '/fees'], ['Sổ liên lạc', '/contact-book']],
  },
};

const readStat = (stats, key) => stats.find((item) => item.key === key)?.value;
const formatNumber = (value) => (value == null ? '—' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value));
const formatMoney = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);
const statusText = (status) => ({ PAID: 'Đã thanh toán', PARTIAL: 'Đã thanh toán một phần', OVERDUE: 'Quá hạn' }[status] || 'Chưa thanh toán');

const metricValue = (metric, stats, analytics) => {
  if (metric[4] === 'attendance') return analytics.attendance?.attendanceRate;
  if (metric[4] === 'assignments') return analytics.assignments?.[metric[0]];
  return readStat(stats, metric[0]);
};

const DashboardContent = ({ data, role, analytics = {}, navigate }) => {
  const config = roleContent[role];
  const stats = data?.stats || [];
  if (!config) return <div className="role-dashboard-empty"><h1>Tổng quan</h1><p>Chưa có dữ liệu dashboard cho vai trò này.</p></div>;

  const metrics = config.metrics.map((metric) => ({ metric, value: metricValue(metric, stats, analytics) }));
  const totalCount = (key) => readStat(stats, key);

  const renderSystem = () => {
    const rows = config.metrics.map((metric) => ({ label: metric[1], value: readStat(stats, metric[0]), unit: metric[2] }));
    const max = Math.max(1, ...rows.map((row) => Number(row.value) || 0));
    return <div className="dashboard-bars">{rows.map((row) => (
      <div className="dashboard-bar-row" key={row.label}>
        <div className="dashboard-bar-copy"><span>{row.label}</span><span className="dashboard-bar-meta">{row.value == null ? 'Chưa có dữ liệu' : `${formatNumber(row.value)} ${row.unit}`}</span></div>
        <div className="dashboard-bar-track"><span className="dashboard-bar-fill" style={{ width: `${Math.max(row.value ? 5 : 0, ((Number(row.value) || 0) / max) * 100)}%` }} /></div>
      </div>
    ))}</div>;
  };

  const renderSchools = () => {
    const schools = data?.schools || [];
    return schools.length ? (
      <div className="dashboard-table-wrap"><table className="dashboard-table"><thead><tr><th>Tên trường</th><th>Mã</th><th>Trạng thái</th></tr></thead><tbody>{schools.slice(0, 5).map((school) => (
        <tr key={school._id || school.code}><td>{school.name}</td><td>{school.code || '—'}</td><td><span className="dashboard-status">{school.status || 'Đang hoạt động'}</span></td></tr>
      ))}</tbody></table></div>
    ) : <EmptyState>Chưa có trường trong phạm vi quản lý.</EmptyState>;
  };

  const renderAttendance = () => {
    const trend = (analytics.attendance?.trend || []).slice(-7);
    if (!trend.length) return <EmptyState>Chưa có dữ liệu điểm danh trong khoảng thời gian này.</EmptyState>;
    const width = 600; const height = 242; const left = 52; const right = 586; const top = 23; const bottom = 194;
    const values = trend.map((entry) => Number(entry.total ? ((entry.present + entry.late) / entry.total) * 100 : 0));
    const floor = Math.max(0, Math.floor(Math.min(...values) / 5) * 5 - 5);
    const ceil = Math.min(100, Math.max(95, Math.ceil(Math.max(...values) / 5) * 5));
    const points = values.map((value, index) => {
      const x = left + (trend.length === 1 ? 0 : index * (right - left) / (trend.length - 1));
      const y = bottom - ((value - floor) / Math.max(1, ceil - floor)) * (bottom - top);
      return { x, y, value, date: trend[index].date };
    });
    const line = points.map((point) => `${point.x},${point.y}`).join(' ');
    const gridValues = [ceil, Math.round((ceil + floor * 3) / 4), Math.round((ceil + floor) / 2), floor];
    return <div className="dashboard-chart-wrap">
      <div className="dashboard-chart-badge">{formatNumber(analytics.attendance?.attendanceRate)}% hôm nay</div>
      <svg className="dashboard-attendance-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tỷ lệ chuyên cần theo từng ngày">
        {gridValues.map((value, index) => { const y = top + index * (bottom - top) / 3; return <g key={`${value}-${index}`}><line x1={left} y1={y} x2={right} y2={y} /><text x="0" y={y + 4}>{formatNumber(value)}%</text></g>; })}
        <polyline points={line} />
        {points.map((point) => <g key={point.date}><circle cx={point.x} cy={point.y} r="4" /><text className="dashboard-chart-date" x={point.x} y="222" textAnchor="middle">{new Date(`${point.date}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</text></g>)}
      </svg>
    </div>;
  };

  const renderAssignments = () => {
    const item = analytics.assignments;
    if (!item) return <EmptyState>Chưa có dữ liệu bài tập trong phạm vi tài khoản.</EmptyState>;
    const rows = [
      ['Đã nộp', item.submitted, item.assignments ? `${formatNumber(item.submitted)} lượt nộp` : 'Chưa có bài tập'],
      ['Đã chấm', item.graded, 'Lượt đã hoàn tất'],
      ['Chưa nộp', Math.max(0, (item.assignments || 0) - (item.submitted || 0)), 'Bài tập cần theo dõi'],
      ['Đang tải', item.pendingUploads, 'Đang đồng bộ'],
    ];
    const max = Math.max(1, ...rows.map((row) => Number(row[1]) || 0));
    return <div className="dashboard-bars">{rows.map(([label, value, detail]) => (
      <div className="dashboard-bar-row" key={label}><div className="dashboard-bar-copy"><span>{label}</span><span className="dashboard-bar-meta">{detail}</span></div><div className="dashboard-bar-track"><span className="dashboard-bar-fill" style={{ width: `${Math.max(value ? 5 : 0, ((Number(value) || 0) / max) * 100)}%` }} /></div></div>
    ))}</div>;
  };

  const renderFees = () => {
    const fees = analytics.fees;
    if (!fees) return <EmptyState>Chưa có dữ liệu thu học phí trong phạm vi tài khoản.</EmptyState>;
    const overdueCount = totalCount('overdue') || 0;
    const rows = [
      ['Đã thu', fees.paid, fees.collectionRate, `${formatNumber(fees.collectionRate)}% kế hoạch`],
      ['Còn phải thu', fees.outstanding, Math.max(0, 100 - fees.collectionRate), `${formatNumber(Math.max(0, 100 - fees.collectionRate))}% kế hoạch`],
      ['Hóa đơn quá hạn', overdueCount, fees.invoiceCount ? (overdueCount / fees.invoiceCount) * 100 : 0, 'Cần ưu tiên rà soát'],
    ];
    return <div className="dashboard-bars">{rows.map(([label, value, percent, detail]) => (
      <div className="dashboard-bar-row" key={label}><div className="dashboard-bar-copy"><span>{label}</span><span className="dashboard-bar-meta">{label === 'Hóa đơn quá hạn' ? `${formatNumber(value)} · ${detail}` : `${formatMoney(value)} · ${detail}`}</span></div><div className="dashboard-bar-track"><span className="dashboard-bar-fill" style={{ width: `${Math.max(value ? 5 : 0, Math.min(100, Number(percent) || 0))}%` }} /></div></div>
    ))}</div>;
  };

  const renderLibrary = () => {
    const rows = config.metrics.map((metric) => ({ label: metric[1], value: readStat(stats, metric[0]), unit: metric[2] }));
    const max = Math.max(1, ...rows.map((row) => Number(row.value) || 0));
    return <div className="dashboard-bars">{rows.map((row) => (
      <div className="dashboard-bar-row" key={row.label}><div className="dashboard-bar-copy"><span>{row.label}</span><span className="dashboard-bar-meta">{row.value == null ? 'Chưa có dữ liệu' : `${formatNumber(row.value)} ${row.unit}`}</span></div><div className="dashboard-bar-track"><span className="dashboard-bar-fill" style={{ width: `${Math.max(row.value ? 5 : 0, ((Number(row.value) || 0) / max) * 100)}%` }} /></div></div>
    ))}</div>;
  };

  const gradeRows = (data?.grades || []).slice(0, 5).map((grade) => ({
    student: grade.studentId?.name || '', subject: grade.subjectId?.name || 'Môn học', semester: grade.semester ? `Học kỳ ${grade.semester}` : '—',
    average: grade.average ?? null,
  }));
  const renderGrades = () => gradeRows.length ? (
    <div className="dashboard-table-wrap"><table className="dashboard-table"><thead><tr>{role === ROLES.PARENT && <th>Học sinh</th>}<th>Môn học</th><th>Học kỳ</th><th>Điểm TB</th></tr></thead><tbody>{gradeRows.map((grade, index) => <tr key={`${grade.student}-${grade.subject}-${index}`}>{role === ROLES.PARENT && <td>{grade.student || 'Con em'}</td>}<td>{grade.subject}</td><td>{grade.semester}</td><td className="dashboard-score">{grade.average == null ? '—' : formatNumber(grade.average)}</td></tr>)}</tbody></table></div>
  ) : <EmptyState>Chưa có kết quả học tập để hiển thị.</EmptyState>;

  const primaryRenderer = {
    system: renderSystem,
    schools: renderSchools,
    attendance: renderAttendance,
    assignments: renderAssignments,
    fees: renderFees,
    library: renderLibrary,
    grades: renderGrades,
  }[config.primary];

  const highlights = config.highlights?.map(([key, label, detail, source]) => {
    const value = source === 'attendance' ? analytics.attendance?.attendanceRate : source === 'assignments' ? analytics.assignments?.[key] : readStat(stats, key);
    return { label, detail, value };
  }).filter((item) => item.value != null) || [];
  const invoices = [ROLES.STUDENT, ROLES.PARENT].includes(role) ? data?.invoices || [] : [];
  const invoiceHighlights = invoices.slice(0, 3).map((invoice) => ({
    label: invoice.title || 'Khoản thu học phí', detail: invoice.dueDate ? `Hạn ${new Date(invoice.dueDate).toLocaleDateString('vi-VN')}` : statusText(invoice.status),
    value: formatMoney(invoice.amount), overdue: invoice.status === 'OVERDUE' || invoice.status === 'UNPAID',
  }));
  const rightItems = invoiceHighlights.length ? invoiceHighlights : highlights;
  const quickLinks = config.quickLinks.filter(([, path]) => path && path !== '/dashboard');
  const secondaryRoute = {
    [ROLES.SUPER_ADMIN]: '/audit-logs',
    [ROLES.CLUSTER_ADMIN]: '/fees',
    [ROLES.SCHOOL_ADMIN]: '/leave',
    [ROLES.ACADEMIC_AFFAIRS]: '/assignments',
    [ROLES.SUBJECT_TEACHER]: '/assignments',
    [ROLES.HOMEROOM_TEACHER]: '/attendance',
    [ROLES.ACCOUNTANT]: '/fees',
    [ROLES.LIBRARIAN]: '/facilities',
    [ROLES.STUDENT]: '/fees',
    [ROLES.PARENT]: '/fees',
  }[role] || '/dashboard';

  return (
    <main className="role-dashboard">
      <header className="dashboard-heading">
        <div><h1>Tổng quan</h1><p>{config.subtitle}</p></div>
        <span className="dashboard-data-label"><span />DỮ LIỆU TỪ HỆ THỐNG</span>
      </header>

      <section className="dashboard-metrics" aria-label="Chỉ số tổng quan">
        {metrics.map(({ metric, value }) => (
          <article className="dashboard-metric" key={metric[0]}>
            <div className="dashboard-metric-label"><span className="dashboard-metric-icon" aria-hidden="true">{metricIcons[metric[0]]}</span><span>{metric[1]}</span></div>
            <strong>{metric[0] === 'attendanceRate' ? `${formatNumber(value)}%` : formatNumber(value)}</strong>
            <small>{metric[2] || 'tỷ lệ'}</small>
          </article>
        ))}
      </section>

      <section className="dashboard-panel-grid">
        <article className="dashboard-panel dashboard-primary-panel">
          <h2>{config.primaryTitle}</h2>
          {primaryRenderer()}
          <p className="dashboard-panel-caption">Số liệu theo phạm vi và quyền của tài khoản đang đăng nhập.</p>
        </article>
        <article className="dashboard-panel dashboard-secondary-panel">
          <div className="dashboard-panel-heading"><h2>{config.secondaryTitle}</h2><button type="button" onClick={() => navigate(secondaryRoute)}>Xem tất cả <span aria-hidden="true">→</span></button></div>
          <div className="dashboard-highlight-list">
            {rightItems.length ? rightItems.map((item, index) => (
              <button className="dashboard-highlight" key={`${item.label}-${index}`} type="button" onClick={() => navigate(secondaryRoute)}>
                <img src={priorityDot} alt="" /><span className="dashboard-highlight-copy"><strong>{item.label}</strong><small>{item.detail}</small></span><b className={item.overdue ? 'is-priority' : ''}>{typeof item.value === 'string' ? item.value : formatNumber(item.value)}</b>
              </button>
            )) : <EmptyState>Không có mục cần theo dõi.</EmptyState>}
          </div>
        </article>
      </section>

      <section className="dashboard-panel dashboard-shortcuts">
        <h2>Truy cập nhanh</h2><p>Lối tắt theo nghiệp vụ của vai trò</p>
        <div className="dashboard-shortcut-list">{quickLinks.map(([label, path]) => (
          <button key={`${label}-${path}`} type="button" onClick={() => navigate(path)}><img src={quickLinkDot} alt="" /><span>{label}</span></button>
        ))}</div>
        <small>Số liệu trong các khu vực trên được tải từ API theo tài khoản hiện tại.</small>
      </section>
    </main>
  );
};

const EmptyState = ({ children }) => <div className="dashboard-empty-state">{children}</div>;

export default DashboardContent;
