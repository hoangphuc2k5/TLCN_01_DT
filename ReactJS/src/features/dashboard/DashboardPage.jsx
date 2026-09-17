import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Typography, Spin, Alert, List, Progress, Space, Tag } from 'antd';
import { getDashboardApi } from '../../api';

const DashboardPage = () => {
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
  const money = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

  return (
    <div>
      <Typography.Title level={3}>{data?.title || 'Dashboard'}</Typography.Title>
      <Row gutter={[16, 16]}>
        {(data?.stats || []).map((s) => (
          <Col xs={24} sm={12} md={8} lg={6} key={s.key}>
            <Card>
              <Statistic title={s.label} value={s.value} />
            </Card>
          </Col>
        ))}
      </Row>
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
      {Object.keys(analytics).length ? (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {analytics.attendance ? (
            <Col xs={24} lg={12}>
              <Card title="Thống kê chuyên cần">
                <Statistic title="Tỷ lệ có mặt" value={analytics.attendance.attendanceRate} suffix="%" />
                <Progress percent={analytics.attendance.attendanceRate} status="active" />
                <Space wrap>
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
                <Statistic title="Đã thu / phải thu" value={analytics.fees.paid} formatter={() => `${money(analytics.fees.paid)} / ${money(analytics.fees.billed)}`} />
                <Progress percent={analytics.fees.collectionRate} />
                <Typography.Text type="secondary">Còn phải thu: {money(analytics.fees.outstanding)} · {analytics.fees.invoiceCount} hóa đơn</Typography.Text>
              </Card>
            </Col>
          ) : null}
          {analytics.grades ? (
            <Col xs={24} lg={12}>
              <Card title="Thống kê học tập">
                <Statistic title="Điểm trung bình" value={analytics.grades.average ?? '—'} />
                <List size="small" dataSource={analytics.grades.distribution} renderItem={(item) => <List.Item>{item.label}<Tag>{item.value}</Tag></List.Item>} />
              </Card>
            </Col>
          ) : null}
          {analytics.assignments ? (
            <Col xs={24} lg={12}>
              <Card title="Thống kê bài tập">
                <Row gutter={12}>
                  <Col span={8}><Statistic title="Bài tập" value={analytics.assignments.assignments} /></Col>
                  <Col span={8}><Statistic title="Đã nộp" value={analytics.assignments.submitted} /></Col>
                  <Col span={8}><Statistic title="Đã chấm" value={analytics.assignments.graded} /></Col>
                </Row>
                {analytics.assignments.pendingUploads ? <Alert style={{ marginTop: 12 }} type="warning" showIcon message={`${analytics.assignments.pendingUploads} bài đang tải file`} /> : null}
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
