import { useEffect, useState } from 'react';
import { Button, Card, Input, Space, Table, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { getDatedScheduleApi } from '../../api';
const kinds = { REGULAR: ['Theo TKB', 'blue'], CANCELLED: ['Nghỉ dạy', 'red'], MAKEUP: ['Dạy bù', 'green'] };
export default function DatedSchedulePanel() {
  const [fromDate, setFrom] = useState(dayjs().format('YYYY-MM-DD'));
  const [toDate, setTo] = useState(dayjs().add(6, 'day').format('YYYY-MM-DD'));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const res = await getDatedScheduleApi({ fromDate, toDate });
      if (res?.EC === 0) setRows(res.data || []);
      else { setRows([]); message.error(res?.EM || 'Không tải được lịch'); }
    } catch { setRows([]); message.error('Không tải được lịch'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  return <Card title="Lịch theo ngày" style={{ marginBottom: 20 }}>
    <p>Lịch đã duyệt, bao gồm tiết nghỉ và dạy bù. Mỗi lần xem tối đa 31 ngày.</p>
    <Space wrap style={{ marginBottom: 16 }}>
      <label>Từ ngày <Input type="date" aria-label="Lịch từ ngày" value={fromDate} onChange={e => setFrom(e.target.value)} /></label>
      <label>Đến ngày <Input type="date" aria-label="Lịch đến ngày" value={toDate} onChange={e => setTo(e.target.value)} /></label>
      <Button aria-label="Xem lịch" onClick={load} loading={loading}>Xem lịch</Button>
    </Space>
    <Table size="small" rowKey="key" loading={loading} dataSource={rows} scroll={{ x: 720 }} pagination={{ pageSize: 50 }} columns={[
      { title: 'Ngày', dataIndex: 'date', render: v => dayjs(v).format('DD/MM/YYYY') },
      { title: 'Tiết', dataIndex: 'period' },
      { title: 'Lớp', render: (_, r) => r.classId?.name || '—' },
      { title: 'Môn', render: (_, r) => r.subjectId?.name || '—' },
      { title: 'Giáo viên', render: (_, r) => r.teacherId?.name || '—' },
      { title: 'Phòng', dataIndex: 'room' },
      { title: 'Lịch', dataIndex: 'kind', render: v => <Tag color={kinds[v]?.[1]}>{kinds[v]?.[0] || v}</Tag> },
      { title: 'Bù cho tiết', render: (_, r) => r.kind === 'MAKEUP' ? `${dayjs(r.originalDate).format('DD/MM/YYYY')} · Tiết ${r.originalPeriod}` : '—' },
    ]} />
  </Card>;
}
