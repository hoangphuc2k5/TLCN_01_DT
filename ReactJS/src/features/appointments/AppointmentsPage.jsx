import { useEffect, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import {
  cancelAppointmentApi,
  createAppointmentApi,
  getAppointmentsApi,
  getUserDirectoryApi,
  reviewAppointmentApi,
  submitSurveyApi,
} from '../../api';
import { ROLES } from '../../constants/roles';
import { can } from '../../util/permissions';

const statusColor = { REQUESTED: 'gold', CONFIRMED: 'green', DECLINED: 'red', CANCELLED: 'default', COMPLETED: 'blue' };

const AppointmentsPage = () => {
  const { user } = useSelector(s => s.auth);
  const isParent = user?.role === ROLES.PARENT;
  const canManage = can(user, 'appointments', 'update');
  const canRequest = can(user, 'appointments', 'create');
  const canSurvey = can(user, 'surveys', 'create');
  const [rows, setRows] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [open, setOpen] = useState(false);
  const [survey, setSurvey] = useState(null);
  const [form] = Form.useForm();
  const [surveyForm] = Form.useForm();

  const load = async () => {
    const res = await getAppointmentsApi();
    if (res?.EC === 0) setRows(res.data || []);
  };
  useEffect(() => {
    load();
    if (isParent && canRequest) {
      Promise.all([getUserDirectoryApi({ role: ROLES.STUDENT }), getUserDirectoryApi({ role: ROLES.SUBJECT_TEACHER }), getUserDirectoryApi({ role: ROLES.HOMEROOM_TEACHER })]).then(([s, t, h]) => {
        if (s?.EC === 0) setStudents((s.data || []).filter(row => (user.parentOf || []).some(id => String(id) === String(row._id))));
        if (t?.EC === 0 || h?.EC === 0) setTeachers([...(t?.data || []), ...(h?.data || [])]);
      });
    }
  }, []);

  const review = async (row, status) => {
    const res = await reviewAppointmentApi(row._id, { status });
    if (res?.EC === 0) { message.success('Da cap nhat lich hen'); load(); }
    else message.error(res?.EM);
  };

  return <div>
    {isParent && canRequest && <Button type="primary" onClick={() => { form.resetFields(); setOpen(true); }}>Dat lich hen</Button>}
    <Table rowKey="_id" style={{ marginTop: 16 }} dataSource={rows} columns={[
      { title: 'Thoi gian', dataIndex: 'scheduledAt', render: v => dayjs(v).format('DD/MM/YYYY HH:mm') },
      { title: 'Giao vien', render: (_, r) => r.teacherId?.name },
      { title: 'Hoc sinh', render: (_, r) => r.studentId?.name },
      { title: 'Ly do', dataIndex: 'reason' },
      { title: 'Trang thai', dataIndex: 'status', render: v => <Tag color={statusColor[v]}>{v}</Tag> },
      { title: 'Thao tac', render: (_, r) => <Space>
        {canManage && ['REQUESTED', 'CONFIRMED'].includes(r.status) && <>
          {r.status === 'REQUESTED' && <Button size="small" onClick={() => review(r, 'CONFIRMED')}>Xac nhan</Button>}
          <Button size="small" onClick={() => review(r, 'DECLINED')}>Tu choi</Button>
          {r.status === 'CONFIRMED' && <Button size="small" onClick={() => review(r, 'COMPLETED')}>Hoan tat</Button>}
        </>}
        {canRequest && ['REQUESTED', 'CONFIRMED'].includes(r.status) && <Button size="small" onClick={async () => { const res = await cancelAppointmentApi(r._id); if (res?.EC === 0) load(); else message.error(res?.EM); }}>Huy</Button>}
        {isParent && canSurvey && r.status === 'COMPLETED' && <Button size="small" onClick={() => { setSurvey(r); surveyForm.resetFields(); }}>Khao sat</Button>}
      </Space> },
    ].filter(c => c.title)} />

    <Modal open={open} title="Dat lich hen giao vien" onCancel={() => setOpen(false)} onOk={() => form.submit()}>
      <Form form={form} layout="vertical" onFinish={async v => { const res = await createAppointmentApi(v); if (res?.EC === 0) { setOpen(false); message.success('Da dat lich'); load(); } else message.error(res?.EM); }}>
        <Form.Item name="studentId" label="Hoc sinh" rules={[{ required: true }]}><Select options={students.map(s => ({ value: s._id, label: s.name }))} /></Form.Item>
        <Form.Item name="teacherId" label="Giao vien" rules={[{ required: true }]}><Select options={teachers.map(s => ({ value: s._id, label: s.name }))} /></Form.Item>
        <Form.Item name="scheduledAt" label="Thoi gian" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item>
        <Form.Item name="durationMinutes" label="Thoi luong (phut)" initialValue={30}><InputNumber min={15} max={120} /></Form.Item>
        <Form.Item name="mode" label="Hinh thuc" initialValue="ONLINE"><Select options={[{ value: 'ONLINE', label: 'Online' }, { value: 'OFFLINE', label: 'Tai truong' }]} /></Form.Item>
        <Form.Item name="reason" label="Ly do" rules={[{ required: true }]}><Input.TextArea maxLength={1000} /></Form.Item>
      </Form>
    </Modal>
    <Modal open={!!survey} title="Khao sat hai long" onCancel={() => setSurvey(null)} onOk={() => surveyForm.submit()}>
      <Form form={surveyForm} layout="vertical" onFinish={async v => { const res = await submitSurveyApi(survey._id, v); if (res?.EC === 0) { setSurvey(null); message.success('Da gui khao sat'); } else message.error(res?.EM); }}>
        <Form.Item name="rating" label="Danh gia (1-5)" rules={[{ required: true }]}><InputNumber min={1} max={5} /></Form.Item>
        <Form.Item name="comment" label="Nhan xet"><Input.TextArea maxLength={2000} /></Form.Item>
      </Form>
    </Modal>
  </div>;
};

export default AppointmentsPage;
