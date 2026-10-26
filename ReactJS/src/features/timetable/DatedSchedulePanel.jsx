import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { getAcademicYearsApi, getDatedScheduleApi } from '../../services/api.service';

const kinds = { REGULAR: ['Theo TKB', 'blue'], CANCELLED: ['Nghỉ dạy', 'red'], MAKEUP: ['Dạy bù', 'green'] };

const generateWeeks = (year) => {
  if (!year?.startDate || !year?.endDate) return [];
  const start = dayjs(year.startDate);
  const end = dayjs(year.endDate);
  const today = dayjs().format('YYYY-MM-DD');
  const list = [];
  let monday = start.day() === 0 ? start.subtract(6, 'day') : start.subtract(start.day() - 1, 'day');
  let idx = 1;
  while (monday.isBefore(end) || monday.isSame(end, 'day')) {
    const sunday = monday.add(6, 'day');
    const mStr = monday.format('YYYY-MM-DD');
    const sStr = sunday.format('YYYY-MM-DD');
    const isCurrent = today >= mStr && today <= sStr;
    list.push({
      index: idx,
      mondayStr: mStr,
      sundayStr: sStr,
      isCurrent,
      value: `${mStr}_${sStr}`,
      label: `Tuần ${idx}: ${monday.format('DD/MM')} - ${sunday.format('DD/MM/YYYY')}${isCurrent ? ' (Tuần hiện tại)' : ''}`,
    });
    monday = monday.add(7, 'day');
    idx++;
  }
  return list;
};

export default function DatedSchedulePanel() {
  const [fromDate, setFrom] = useState(dayjs().format('YYYY-MM-DD'));
  const [toDate, setTo] = useState(dayjs().add(6, 'day').format('YYYY-MM-DD'));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [years, setYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const dateRangeEdited = useRef(false);
  const initialDateRange = useRef({ fromDate, toDate });

  const loadSchedule = useCallback(async (from, to) => {
    setLoading(true);
    try {
      const res = await getDatedScheduleApi({ fromDate: from, toDate: to });
      if (res?.EC === 0) setRows(res.data || []);
      else { setRows([]); message.error(res?.EM || 'Không tải được lịch'); }
    } catch { setRows([]); message.error('Không tải được lịch'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    getAcademicYearsApi().then(res => {
      if (res?.EC === 0 && Array.isArray(res.data) && res.data.length > 0) {
        setYears(res.data);
        const active = res.data.find(y => y.isCurrent) || res.data[0];
        setSelectedYearId(active._id);
        const wList = generateWeeks(active);
        setWeeks(wList);
        if (dateRangeEdited.current) return;
        const curWeek = wList.find(w => w.isCurrent) || wList[0];
        if (curWeek) {
          setSelectedWeek(curWeek.value);
          setFrom(curWeek.mondayStr);
          setTo(curWeek.sundayStr);
          loadSchedule(curWeek.mondayStr, curWeek.sundayStr);
          return;
        }
      }
      if (!dateRangeEdited.current) loadSchedule(initialDateRange.current.fromDate, initialDateRange.current.toDate);
    }).catch(() => {
      if (!dateRangeEdited.current) loadSchedule(initialDateRange.current.fromDate, initialDateRange.current.toDate);
    });
  }, [loadSchedule]);

  const handleYearChange = (yearId) => {
    setSelectedYearId(yearId);
    const y = years.find(item => item._id === yearId);
    const wList = generateWeeks(y);
    setWeeks(wList);
    const curWeek = wList.find(w => w.isCurrent) || wList[0];
    if (curWeek) {
      setSelectedWeek(curWeek.value);
      setFrom(curWeek.mondayStr);
      setTo(curWeek.sundayStr);
      loadSchedule(curWeek.mondayStr, curWeek.sundayStr);
    } else {
      setSelectedWeek(null);
      setRows([]);
    }
  };

  const handleWeekChange = (val) => {
    setSelectedWeek(val);
    if (!val) return;
    const [mStr, sStr] = val.split('_');
    setFrom(mStr);
    setTo(sStr);
    loadSchedule(mStr, sStr);
  };

  return (
    <Card title="Lịch theo ngày" style={{ marginBottom: 20 }}>
      <p>Lịch đã duyệt, bao gồm tiết nghỉ và dạy bù. Chọn năm học và tuần học để xem lịch học thực tế.</p>
      <Space wrap style={{ marginBottom: 16 }}>
        {years.length > 0 && (
          <Select
            style={{ minWidth: 160 }}
            placeholder="Chọn năm học"
            value={selectedYearId}
            onChange={handleYearChange}
            options={years.map(y => ({ value: y._id, label: `${y.name}${y.isCurrent ? ' (Hiện tại)' : ''}` }))}
          />
        )}
        {weeks.length > 0 && (
          <Select
            style={{ minWidth: 280 }}
            placeholder="Chọn tuần học"
            value={selectedWeek}
            onChange={handleWeekChange}
            options={weeks.map(w => ({ value: w.value, label: w.label }))}
          />
        )}
        <label>Từ ngày <Input type="date" aria-label="Lịch từ ngày" value={fromDate} onChange={e => { dateRangeEdited.current = true; setFrom(e.target.value); setSelectedWeek(null); }} /></label>
        <label>Đến ngày <Input type="date" aria-label="Lịch đến ngày" value={toDate} onChange={e => { dateRangeEdited.current = true; setTo(e.target.value); setSelectedWeek(null); }} /></label>
        <Button aria-label="Xem lịch" onClick={() => loadSchedule(fromDate, toDate)} loading={loading}>Xem lịch</Button>
        <Button onClick={() => {
          const start = dayjs().startOf('week').format('YYYY-MM-DD');
          const end = dayjs().endOf('week').format('YYYY-MM-DD');
          setFrom(start); setTo(end);
          setSelectedWeek(null);
          loadSchedule(start, end);
        }}>Tuần này</Button>
        <Button onClick={() => {
          const start = dayjs().format('YYYY-MM-DD');
          const end = dayjs().add(30, 'day').format('YYYY-MM-DD');
          setFrom(start); setTo(end);
          setSelectedWeek(null);
          loadSchedule(start, end);
        }}>30 ngày tới</Button>
      </Space>
      <Table
        size="small"
        rowKey="key"
        loading={loading}
        dataSource={rows}
        scroll={{ x: 720 }}
        pagination={{ pageSize: 50 }}
        locale={{ emptyText: 'Chưa có lịch cho khoảng thời gian này' }}
        columns={[
          { title: 'Ngày', dataIndex: 'date', render: v => dayjs(v).format('DD/MM/YYYY') },
          { title: 'Tiết', dataIndex: 'period' },
          { title: 'Lớp', render: (_, r) => r.classId?.name || '—' },
          { title: 'Môn', render: (_, r) => r.subjectId?.name || '—' },
          { title: 'Giáo viên', render: (_, r) => r.teacherId?.name || '—' },
          { title: 'Phòng', dataIndex: 'room' },
          { title: 'Lịch', dataIndex: 'kind', render: v => <Tag color={kinds[v]?.[1]}>{kinds[v]?.[0] || v}</Tag> },
          { title: 'Bù cho tiết', render: (_, r) => r.kind === 'MAKEUP' ? `${dayjs(r.originalDate).format('DD/MM/YYYY')} · Tiết ${r.originalPeriod}` : '—' },
        ]}
      />
    </Card>
  );
}
