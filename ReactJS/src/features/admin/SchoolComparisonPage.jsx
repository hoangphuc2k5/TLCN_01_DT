import { useEffect, useState } from 'react';
import { Button, Card, Input, DatePicker, Alert, Select, Space, Table, message } from 'antd';
import { compareSchoolsApi, exportSchoolComparisonApi, getSchoolsApi } from '../../api';
const SchoolComparisonPage = () => {
  const detailLabels = { gradeSheets: 'Số bảng điểm', billedAmount: 'Phải thu (VND)', paidAmount: 'Đã thu (VND)', attendanceRecords: 'Lượt điểm danh', presentCount: 'Có mặt', absentCount: 'Vắng', lateCount: 'Đi muộn' };
  const [filters, setFilters] = useState({}); const [busy, setBusy] = useState(false);
  const [schools, setSchools] = useState([]); const [selected, setSelected] = useState([]); const [rows, setRows] = useState([]);
  useEffect(() => { getSchoolsApi().then(result => { if (result?.EC !== 0) throw new Error(result?.EM); setSchools(result.data || []); }).catch(error => message.error(error.message || 'Cannot load schools')); }, []);
  const compare = async () => {
    if (selected.length < 2) return message.warning('Chọn ít nhất hai trường');
    setBusy(true);
    try {
      const result = await compareSchoolsApi(selected, filters);
      if (result?.EC !== 0) throw new Error(result?.EM || 'Không thể đối chiếu');
      setRows(result.data || []);
    } catch (error) { setRows([]); message.error(error.message); }
    finally { setBusy(false); }
  };
  const download = async format => {
    if (selected.length < 2) return message.warning('Chọn ít nhất hai trường');
    setBusy(true);
    try {
      const blob = await exportSchoolComparisonApi(format, selected, filters);
      const mime = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      if (!(blob instanceof Blob) || !blob.type.includes(mime)) {
        const error = blob instanceof Blob ? JSON.parse(await blob.text()) : blob;
        throw new Error(error?.EM || 'Không thể xuất báo cáo');
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = 'doi-chieu-lien-truong.' + format;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { message.error(error.message); }
    finally { setBusy(false); }
  };
  return <Card title="Đối chiếu liên trường"><Alert type="info" message="Nhân sự là số hiện tại. Năm học lọc lớp/điểm/hóa đơn/điểm danh; học kỳ chỉ lọc điểm. Khoảng ngày lọc ngày điểm danh và hạn hóa đơn. Có mặt không gồm đi muộn; tiền đã thu là tổng hiện tại của hóa đơn." />
    <Space wrap style={{ marginBottom: 16 }}><Select mode="multiple" showSearch optionFilterProp="label" value={selected} disabled={busy} onChange={value => { setSelected(value); setRows([]); }} options={schools.map(school => ({ value: school._id, label: `${school.name} (${school.code})` }))} style={{ minWidth: 420 }} /><Input aria-label="Năm học" placeholder="Tên năm học chung, ví dụ 2026-2027" disabled={busy} style={{ width: 270 }} onChange={e => { setFilters(f => ({ ...f, academicYear: e.target.value || undefined })); setRows([]); }} />
    <Select aria-label="Học kỳ" allowClear placeholder="Học kỳ (điểm)" disabled={busy} style={{ width: 160 }} options={[{ value: 1, label: 'Học kỳ 1' }, { value: 2, label: 'Học kỳ 2' }]} onChange={semester => { setFilters(f => ({ ...f, semester })); setRows([]); }} />
    <DatePicker.RangePicker disabled={busy} onChange={(_, dates) => { setFilters(f => ({ ...f, fromDate: dates[0] || undefined, toDate: dates[1] || undefined })); setRows([]); }} />
    <Button disabled={busy} type="primary"  onClick={compare}>Đối chiếu</Button><Button disabled={busy} onClick={() => download('xlsx')}>Xuất Excel</Button><Button disabled={busy} onClick={() => download('pdf')}>Xuất PDF</Button></Space><Table loading={busy} scroll={{ x: 1800 }} rowKey={row => row.school._id} dataSource={rows} expandable={{ expandedRowRender: row => <Space wrap>{['gradeSheets', 'billedAmount', 'paidAmount', 'attendanceRecords', 'presentCount', 'absentCount', 'lateCount'].map(key => <span key={key}>{detailLabels[key]}: {row[key]}</span>)}</Space> }} columns={[{ title: 'Trường', render: (_, row) => `${row.school.name} (${row.school.code})` }, { title: 'Học sinh', dataIndex: 'students' }, { title: 'Giáo viên', dataIndex: 'teachers' }, { title: 'Lớp', dataIndex: 'classes' }, { title: 'Điểm TB', dataIndex: 'gradeAverage', render: value => value == null ? '-' : Number(value).toFixed(2) }, { title: 'Tỷ lệ có mặt', dataIndex: 'attendanceRate', render: value => value == null ? '-' : `${value}%` }, { title: 'Nợ còn lại', dataIndex: 'outstandingAmount', render: value => Number(value).toLocaleString('vi-VN') }]} /></Card>;
};
export default SchoolComparisonPage;
