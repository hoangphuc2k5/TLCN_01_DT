import { useEffect, useState } from 'react';
import { Table } from 'antd';
import dayjs from 'dayjs';
import { getAuditLogsApi } from '../../api';

const AuditLogsPage = () => {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      const res = await getAuditLogsApi({ limit: 200 });
      if (res?.EC === 0) setRows(res.data || []);
    })();
  }, []);

  return (
    <Table
      rowKey="_id"
      dataSource={rows}
      columns={[
        {
          title: 'Thời gian',
          dataIndex: 'createdAt',
          render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm:ss'),
        },
        { title: 'Người thực hiện', render: (_, r) => r.actorId?.name || '—' },
        { title: 'Hành động', dataIndex: 'action' },
        { title: 'Tài nguyên', dataIndex: 'resource' },
        { title: 'ID', dataIndex: 'resourceId' },
        { title: 'IP', dataIndex: 'ip' },
      ]}
    />
  );
};

export default AuditLogsPage;
