import { useEffect, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd';
import { useSelector } from 'react-redux';
import { createRewardApi, getAcademicYearsApi, getClassStudentsApi, getClassesApi, getRewardsApi, reviewRewardApi } from '../../api';
import { can } from '../../util/permissions';

const RewardsPage = () => {
  const { user } = useSelector(s => s.auth);
  const canManage = can(user, 'rewards', 'create') && can(user, 'rewards', 'update');
  const canReview = can(user, 'rewards', 'execute');
  const [rows, setRows] = useState([]); const [classes, setClasses] = useState([]); const [years, setYears] = useState([]); const [students, setStudents] = useState([]); const [open, setOpen] = useState(false); const [form] = Form.useForm();
  const load = async () => { const r = await getRewardsApi(); if (r?.EC === 0) setRows(r.data || []); };
  useEffect(() => { (async () => { if (canManage) { const [c, y] = await Promise.all([getClassesApi(), getAcademicYearsApi()]); if (c?.EC === 0) setClasses(c.data || []); if (y?.EC === 0) setYears(y.data || []); } load(); })(); }, []);
  return <div>
    {canManage && <Button type="primary" onClick={() => { form.resetFields(); setOpen(true); }}>Tao khen thuong/ky luat</Button>}
    <Table rowKey="_id" style={{ marginTop: 16 }} dataSource={rows} columns={[
      { title: 'Hoc sinh', render: (_, r) => r.studentId?.name }, { title: 'Loai', dataIndex: 'type', render: v => <Tag color={v === 'REWARD' ? 'green' : 'red'}>{v}</Tag> }, { title: 'Tieu de', dataIndex: 'title' }, { title: 'Diem', dataIndex: 'points' }, { title: 'Trang thai', dataIndex: 'status' }, { title: 'Thao tac', render: (_, r) => canReview && r.status === 'PENDING' ? <Space><Button size="small" onClick={async () => { const x = await reviewRewardApi(r._id, { status: 'APPROVED' }); if (x?.EC === 0) load(); else message.error(x?.EM); }}>Duyet</Button><Button size="small" onClick={async () => { const x = await reviewRewardApi(r._id, { status: 'REJECTED' }); if (x?.EC === 0) load(); else message.error(x?.EM); }}>Tu choi</Button></Space> : null },
    ].filter(c => c.title)} />
    <Modal open={open} title="Khen thuong/ky luat" onCancel={() => setOpen(false)} onOk={() => form.submit()}><Form form={form} layout="vertical" onFinish={async v => { const r = await createRewardApi(v); if (r?.EC === 0) { setOpen(false); load(); message.success('Da tao ban ghi'); } else message.error(r?.EM); }}>
      <Form.Item name="classId" label="Lop" rules={[{ required: true }]}><Select options={classes.map(c => ({ value: c._id, label: c.name }))} onChange={async id => { const r = await getClassStudentsApi(id); if (r?.EC === 0) setStudents(r.data || []); }} /></Form.Item>
      <Form.Item name="studentId" label="Hoc sinh" rules={[{ required: true }]}><Select options={students.map(s => ({ value: s._id, label: s.name }))} /></Form.Item>
      <Form.Item name="academicYearId" label="Nam hoc" rules={[{ required: true }]}><Select options={years.map(y => ({ value: y._id, label: y.name }))} /></Form.Item>
      <Form.Item name="type" label="Loai" rules={[{ required: true }]}><Select options={[{ value: 'REWARD', label: 'Khen thuong' }, { value: 'DISCIPLINE', label: 'Ky luat' }]} /></Form.Item>
      <Form.Item name="title" label="Tieu de" rules={[{ required: true }]}><Input maxLength={200} /></Form.Item><Form.Item name="description" label="Mo ta"><Input.TextArea maxLength={2000} /></Form.Item><Form.Item name="points" label="Diem" initialValue={0}><InputNumber min={-100} max={100} /></Form.Item>
    </Form></Modal>
  </div>;
};
export default RewardsPage;
