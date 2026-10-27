import { useEffect, useState } from 'react';
import { Alert, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ROLES } from '../../constants/roles';
import { getAuditLogsApi, getDashboardApi } from '../../services/api.service';
import DashboardContent from './DashboardContent';
import './dashboard.css';

const DashboardPage = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [response, auditResponse] = await Promise.all([
          getDashboardApi(),
          user?.role === ROLES.SUPER_ADMIN ? getAuditLogsApi({ limit: 8 }).catch(() => null) : Promise.resolve(null),
        ]);
        if (!active) return;
        if (response?.EC === 0) setData(response.data);
        else setError(response?.EM || 'Không tải được dashboard');
        if (auditResponse?.EC === 0) setActivities(Array.isArray(auditResponse.data) ? auditResponse.data : []);
      } catch {
        if (active) setError('Không tải được dashboard. Vui lòng thử lại.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user?.role]);

  if (loading) return <div className="dashboard-loading"><Spin /></div>;
  if (error) return <Alert type="error" showIcon message={error} />;

  return <DashboardContent data={data} role={user?.role} analytics={data?.analytics || {}} activities={activities} navigate={navigate} />;
};

export default DashboardPage;
