import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Typography, Spin, Alert, List, Progress, Space, Tag, Button, Table } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  CalendarOutlined,
  BookOutlined,
  FormOutlined,
  DollarCircleOutlined,
  ContactsOutlined,
  FileDoneOutlined,
} from '@ant-design/icons';
import { getDashboardApi } from '../../services/api.service';
import { ROLES } from '../../constants/roles';

const DashboardPage = () => {
  const { user } = useSelector((s) => s.auth);
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await getDashboardApi();
      if (res?.EC === 0) setData(res.data);
      else setError(res?.EM || 'Không tải được dashboard');
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spin />;
  if (error) return <Alert type="error" message={error} />;

  const analytics = data?.analytics || {};
  const money = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

  const isStudent = user?.role === ROLES.STUDENT;
  const isParent = user?.role === ROLES.PARENT;

  const invoiceColumns = [
    {
      title: 'Khoản thu',
      dataIndex: 'title',
      key: 'title',
      render: (t, r) => (
        <Space orientation="vertical" size={2}>
          <Typography.Text strong>{t}</Typography.Text>
          {r.studentId?.name ? <Typography.Text type="secondary">Học sinh: {r.studentId.name}</Typography.Text> : null}
        </Space>
      ),
    },
    {
      title: 'Hạn nộp',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—'),
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      render: (amt) => money(amt),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (st) => {
        const color = st === 'PAID' ? 'green' : st === 'OVERDUE' ? 'red' : st === 'PARTIAL' ? 'blue' : 'gold';
        const label = st === 'PAID' ? 'Đã nộp' : st === 'OVERDUE' ? 'Quá hạn' : st === 'PARTIAL' ? 'Nộp một phần' : 'Chưa nộp';
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, r) => (
        <Button
          size="small"
          type={r.status !== 'PAID' ? 'primary' : 'default'}
          icon={<DollarCircleOutlined />}
          onClick={() => navigate('/fees')}
        >
          {r.status !== 'PAID' ? 'Thanh toán' : 'Chi tiết'}
        </Button>
      ),
    },
  ];

  const gradeColumns = [
    {
      title: 'Môn học',
      dataIndex: ['subjectId', 'name'],
      key: 'subject',
      render: (s) => s || 'Môn học',
    },
    ...(isParent
      ? [
          {
            title: 'Học sinh',
            dataIndex: ['studentId', 'name'],
            key: 'student',
            render: (name) => name || 'Con em',
          },
        ]
      : []),
    {
      title: 'Học kỳ',
      dataIndex: 'semester',
      key: 'semester',
      render: (sem) => (sem ? `Học kỳ ${sem}` : '—'),
    },
    {
      title: 'Điểm thành phần',
      dataIndex: 'scores',
      key: 'scores',
      render: (scores) =>
        scores?.length ? (
          <Space wrap size={4}>
            {scores.map((sc, i) => (
              <Tag key={i} color="geekblue">
                {sc.type || 'TX'}: {sc.score}
              </Tag>
            ))}
          </Space>
        ) : (
          <Typography.Text type="secondary">Chưa có</Typography.Text>
        ),
    },
    {
      title: 'ĐTB môn',
      dataIndex: 'finalScore',
      key: 'finalScore',
      render: (fs) =>
        fs != null ? (
          <Typography.Text strong style={{ color: fs >= 8 ? '#52c41a' : fs >= 6.5 ? '#1890ff' : '#faad14' }}>
            {fs}
          </Typography.Text>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Typography.Title level={3} style={{ marginBottom: 0 }}>
            {data?.title || 'Dashboard'}
          </Typography.Title>
        </Col>
      </Row>

      {/* Quick Access Shortcuts for Student & Parent */}
      {(isStudent || isParent) && (
        <Card title="Truy cập nhanh" style={{ marginBottom: 16 }}>
          <Space orientation="horizontal" wrap size={12}>
            <Button icon={<CalendarOutlined />} onClick={() => navigate('/timetable')}>
              Thời khóa biểu
            </Button>
            <Button icon={<BookOutlined />} onClick={() => navigate('/homework')}>
              Bài tập trực tuyến
            </Button>
            <Button icon={<FormOutlined />} onClick={() => navigate('/exams')}>
              Khảo thí & Đề thi
            </Button>
            <Button icon={<ContactsOutlined />} onClick={() => navigate('/contact-book')}>
              Sổ liên lạc
            </Button>
            <Button icon={<FileDoneOutlined />} onClick={() => navigate('/leave')}>
              Đơn xin nghỉ phép
            </Button>
            <Button icon={<DollarCircleOutlined />} onClick={() => navigate('/fees')}>
              Học phí & Hóa đơn
            </Button>
          </Space>
        </Card>
      )}

      {/* Primary Statistic Cards */}
      <Row gutter={[16, 16]}>
        {(data?.stats || []).map((s) => (
          <Col xs={24} sm={12} md={8} lg={6} key={s.key}>
            <Card hoverable>
              <Statistic title={s.label} value={s.value} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Student/Parent Specific: Fee Invoices Widget */}
      {data?.invoices?.length ? (
        <Card
          title="Khoản thu học phí & Hóa đơn gần đây"
          extra={
            <Button type="link" onClick={() => navigate('/fees')}>
              Xem tất cả hóa đơn
            </Button>
          }
          style={{ marginTop: 16 }}
        >
          <Table
            dataSource={data.invoices}
            columns={invoiceColumns}
            rowKey="_id"
            pagination={false}
            size="small"
          />
        </Card>
      ) : null}

      {/* Student/Parent Specific: Grades Widget */}
      {data?.grades?.length ? (
        <Card
          title="Kết quả học tập & Sổ điểm"
          extra={
            <Button type="link" onClick={() => navigate('/grades')}>
              Xem chi tiết bảng điểm
            </Button>
          }
          style={{ marginTop: 16 }}
        >
          <Table
            dataSource={data.grades}
            columns={gradeColumns}
            rowKey="_id"
            pagination={false}
            size="small"
          />
        </Card>
      ) : null}

      {/* Cluster Schools List */}
      {data?.schools?.length ? (
        <Card title="Trường trong cụm" style={{ marginTop: 16 }}>
          <List
            dataSource={data.schools}
            renderItem={(item) => (
              <List.Item>
                {item.name} ({item.code}) — {item.status}
              </List.Item>
            )}
          />
        </Card>
      ) : null}

      {/* Administrative / Teacher Analytics Widgets */}
      {Object.keys(analytics).length ? (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {analytics.attendance ? (
            <Col xs={24} lg={12}>
              <Card title="Thống kê chuyên cần">
                <Statistic title="Tỷ lệ có mặt" value={analytics.attendance.attendanceRate} suffix="%" />
                <Progress percent={analytics.attendance.attendanceRate} status="active" />
                <Space wrap style={{ marginTop: 8 }}>
                  <Tag color="green">Có mặt: {analytics.attendance.present}</Tag>
                  <Tag color="gold">Đi trễ: {analytics.attendance.late}</Tag>
                  <Tag color="orange">Có phép: {analytics.attendance.absentExcused}</Tag>
                  <Tag color="red">Không phép: {analytics.attendance.absentUnexcused}</Tag>
                </Space>
              </Card>
            </Col>
          ) : null}
          {analytics.fees ? (
            <Col xs={24} lg={12}>
              <Card title="Thống kê học phí">
                <Statistic
                  title="Đã thu / phải thu"
                  value={analytics.fees.paid}
                  formatter={() => `${money(analytics.fees.paid)} / ${money(analytics.fees.billed)}`}
                />
                <Progress percent={analytics.fees.collectionRate} />
                <Typography.Text type="secondary">
                  Còn phải thu: {money(analytics.fees.outstanding)} · {analytics.fees.invoiceCount} hóa đơn
                </Typography.Text>
              </Card>
            </Col>
          ) : null}
          {analytics.grades ? (
            <Col xs={24} lg={12}>
              <Card title="Thống kê học tập">
                <Statistic title="Điểm trung bình" value={analytics.grades.average ?? '—'} />
                <List
                  size="small"
                  dataSource={analytics.grades.distribution}
                  renderItem={(item) => (
                    <List.Item>
                      {item.label}
                      <Tag>{item.value}</Tag>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          ) : null}
          {analytics.assignments ? (
            <Col xs={24} lg={12}>
              <Card title="Thống kê bài tập">
                <Row gutter={12}>
                  <Col span={8}>
                    <Statistic title="Bài tập" value={analytics.assignments.assignments} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="Đã nộp" value={analytics.assignments.submitted} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="Đã chấm" value={analytics.assignments.graded} />
                  </Col>
                </Row>
                {analytics.assignments.pendingUploads ? (
                  <Alert style={{ marginTop: 12 }} type="warning" showIcon message={`${analytics.assignments.pendingUploads} bài đang tải file`} />
                ) : null}
              </Card>
            </Col>
          ) : null}
        </Row>
      ) : null}

      {data?.widgets?.length ? (
        <Alert style={{ marginTop: 16 }} type="info" message={data.widgets[0].message} />
      ) : null}
    </div>
  );
};

export default DashboardPage;
