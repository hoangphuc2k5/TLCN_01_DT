import { useEffect, useState } from 'react';
import { Alert, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getDashboardApi } from '../../services/api.service';
import DashboardContent from './DashboardContent';
import './dashboard.css';

const DashboardPage = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const response = await getDashboardApi();
      if (!active) return;
      if (response?.EC === 0) setData(response.data);
      else setError(response?.EM || 'Không tải được dashboard');
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  if (loading) return <div className="dashboard-loading"><Spin /></div>;
  if (error) return <Alert type="error" showIcon message={error} />;

  return <DashboardContent data={data} role={user?.role} analytics={data?.analytics || {}} navigate={navigate} />;
};

export default DashboardPage;
