import { useEffect, useState } from 'react';
import { Alert, Form, Input, InputNumber, Select, message } from 'antd';
import { getDatedScheduleApi } from '../../api';

export default function MakeupFields({ form, teacherId }) {
  const originalDate = Form.useWatch(['makeup', 'originalDate'], form);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setOptions([]);
    form.setFieldsValue({ makeupSource: undefined, makeup: { absenceId: undefined, timetableId: undefined, originalPeriod: undefined } });
    if (!originalDate) return () => { active = false; };
    setLoading(true);
    getDatedScheduleApi({ fromDate: originalDate, toDate: originalDate }).then(res => {
      if (!active) return;
      if (res?.EC === 0) setOptions((res.data || []).filter(s => s.kind === 'CANCELLED' && (s.teacherId?._id || s.teacherId) === teacherId));
      else message.error(res?.EM || 'Không tải được tiết nghỉ');
    }).catch(() => { if (active) message.error('Không tải được tiết nghỉ'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [originalDate, teacherId, form]);
  return <>
    {['absenceId', 'timetableId', 'originalPeriod'].map(field => <Form.Item key={field} name={['makeup', field]} hidden><Input /></Form.Item>)}
    <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Chọn tiết thuộc đơn nghỉ dạy đã duyệt. Lịch bù chỉ xuất hiện trên TKB sau khi được duyệt." />
    <Form.Item name={['makeup', 'originalDate']} label="Ngày nghỉ cần dạy bù" rules={[{ required: true }]}>
      <Input type="date" />
    </Form.Item>
    <Form.Item name="makeupSource" label="Tiết nghỉ" rules={[{ required: true }]}>
      <Select loading={loading} placeholder="Chọn tiết nghỉ" notFoundContent="Không có tiết nghỉ đã duyệt trong ngày này"
        options={options.map(s => ({ value: s.key, label: `${s.classId?.name} · Tiết ${s.period} · ${s.subjectId?.name}` }))}
        onChange={key => {
          const slot = options.find(s => s.key === key);
          if (slot) form.setFieldsValue({ makeup: { absenceId: slot.absenceId, timetableId: slot.timetableId, originalPeriod: slot.period } });
        }} />
    </Form.Item>
    <Form.Item name={['makeup', 'date']} label="Ngày dạy bù" rules={[{ required: true }]}>
      <Input type="date" min={originalDate || undefined} />
    </Form.Item>
    <Form.Item name={['makeup', 'period']} label="Tiết dạy bù" rules={[{ required: true }]}>
      <InputNumber min={1} max={10} precision={0} />
    </Form.Item>
    <Form.Item name={['makeup', 'room']} label="Phòng dạy bù">
      <Input maxLength={100} placeholder="Để trống nếu không sử dụng phòng cố định" />
    </Form.Item>
  </>;
}
