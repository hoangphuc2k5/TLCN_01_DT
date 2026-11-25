import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Empty, List, Popover, Space, Tag, Typography, message } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getNotificationsApi, markNotificationReadApi, openNotificationStream } from '../services/api.service';
import { canVisit } from '../utils/permissions';

const NotificationBell = ({ user }) => {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const userId = user?._id;
  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    let retryTimer;
    const controller = new AbortController();
    setRows([]);
    const load = async () => {
      try {
        const result = await getNotificationsApi();
        if (!active) return;
        if (result?.EC !== 0) { setError(result?.EM || 'Không tải được thông báo'); return; }
        setRows(result.data || []); setError('');
      } catch { if (active) setError('Không tải được thông báo'); }
    };
    const connect = async () => {
      try {
        await openNotificationStream(notification => {
          if (!active || String(notification.userId) !== String(userId)) return;
          setRows(current => [notification, ...current.filter(row => row._id !== notification._id)]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 50));
        }, { signal: controller.signal });
      } catch { /* Reload on focus and periodically if the stream is unavailable. */ }
      if (active) retryTimer = window.setTimeout(connect, 5000);
    };
    load(); connect();
    const interval = window.setInterval(load, 30000);
    window.addEventListener('focus', load);
    return () => {
      active = false; controller.abort(); window.clearTimeout(retryTimer); window.clearInterval(interval);
      window.removeEventListener('focus', load);
    };
  }, [userId]);
  const select = async row => {
    if (!row.isRead) {
      try {
        const result = await markNotificationReadApi(row._id);
        if (result?.EC !== 0) return message.error(result?.EM || 'Không đánh dấu được thông báo');
        setRows(current => current.map(item => item._id === row._id ? { ...item, isRead: true } : item));
      } catch (failure) { message.error(failure.message); return; }
    }
    if (row.type === 'SCHOOL_TRANSFER' && /^[a-f\d]{24}$/i.test(row.meta?.transferId || '') && canVisit(user, '/users')) {
      setOpen(false);
      navigate(`/users?tab=school-transfers&transferId=${row.meta.transferId}`);
    }
  };
  const unread = rows.filter(row => !row.isRead).length;
  return <Popover trigger="click" placement="bottomRight" open={open} onOpenChange={setOpen} title="Thông báo" content={
    <div style={{ width: 'min(380px, 80vw)' }}>
      {error && <Alert type="error" message={error} showIcon />}
      <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        <List dataSource={rows} locale={{ emptyText: <Empty description="Chưa có thông báo" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }} renderItem={row => <List.Item>
          <button type="button" onClick={() => select(row)} style={{ border: 0, background: 'transparent', padding: 8, textAlign: 'left', width: '100%', cursor: 'pointer', color: 'inherit' }}>
            <Space wrap><Typography.Text strong={!row.isRead}>{row.title}</Typography.Text>{!row.isRead && <Tag color="blue">Chưa đọc</Tag>}</Space>
            <div style={{ whiteSpace: 'pre-wrap' }}>{row.message}</div>
            <Typography.Text type="secondary">{new Date(row.createdAt).toLocaleString('vi-VN')}</Typography.Text>
          </button>
        </List.Item>} />
      </div>
      {canVisit(user, '/announcements') && <Button type="link" onClick={() => { setOpen(false); navigate('/announcements'); }}>Xem thông báo chung</Button>}
    </div>
  }>
    <Badge count={unread} size="small"><Button className="dashboard-notification-button" aria-label="Thông báo" title={unread ? `${unread} thông báo chưa đọc` : 'Thông báo'}><BellOutlined aria-hidden="true" /></Button></Badge>
  </Popover>;
};
export default NotificationBell;
