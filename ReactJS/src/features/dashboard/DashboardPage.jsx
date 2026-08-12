import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Typography, Spin, Alert, List } from 'antd';
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
      {data?.widgets?.length ? (
        <Alert style={{ marginTop: 16 }} type="info" message={data.widgets[0].message} />
      ) : null}
    </div>
  );
};

export default DashboardPage;
