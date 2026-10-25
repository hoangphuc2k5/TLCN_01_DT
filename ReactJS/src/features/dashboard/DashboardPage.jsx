import { useEffect, useState } from 'react';
import { Alert, Button, Space, Spin, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { DollarCircleOutlined } from '@ant-design/icons';
import { getDashboardApi } from '../../services/api.service';
import { ROLES } from '../../constants/roles';
import DashboardContent from './DashboardContent';

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
      dataIndex: 'average',
      key: 'average',
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

  return <DashboardContent data={data} analytics={analytics} money={money} isStudent={isStudent} isParent={isParent} invoiceColumns={invoiceColumns} gradeColumns={gradeColumns} navigate={navigate} />;
};

export default DashboardPage;
