import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Modal, Table, message } from 'antd';
import { useSelector } from 'react-redux';
import { createClubApi, getClubRegistrationsApi, getClubsApi, registerClubApi } from '../../api';
import { can } from '../../util/permissions';

export default function ActivitiesPage() {
  const { user } = useSelector(state => state.auth);
  const manage = can(user, 'clubs', 'create');
  const student = user?.role === 'STUDENT';
  const [clubs, setClubs] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [clubOpen, setClubOpen] = useState(false);
  const [clubForm] = Form.useForm();

  const load = async () => {
    const [clubsResult, registrationsResult] = await Promise.all([getClubsApi(), getClubRegistrationsApi()]);
    if (clubsResult?.EC === 0) setClubs(clubsResult.data || []);
    if (registrationsResult?.EC === 0) setRegistrations(registrationsResult.data || []);
  };

  useEffect(() => { load(); }, []);
  const joined = new Set(registrations.filter(item => item.status === 'REGISTERED').map(item => item.clubId?._id));

  return <Card title="Câu lạc bộ / môn tự chọn" extra={manage && <Button type="primary" onClick={() => setClubOpen(true)}>Tạo CLB</Button>}>
    <Table rowKey="_id" dataSource={clubs} columns={[
      { title: 'Tên', dataIndex: 'name' },
      { title: 'Mô tả', dataIndex: 'description' },
      { title: 'Sức chứa', dataIndex: 'capacity' },
      { title: 'Trạng thái', dataIndex: 'status' },
      { title: 'Đăng ký', render: (_, row) => student && row.status === 'OPEN' && !joined.has(row._id) && <Button size="small" onClick={async () => { const result = await registerClubApi(row._id); if (result?.EC === 0) load(); else message.error(result?.EM); }}>Đăng ký</Button> },
    ]} />
    <Modal open={clubOpen} title="Tạo CLB" onCancel={() => setClubOpen(false)} onOk={() => clubForm.submit()}>
      <Form form={clubForm} layout="vertical" onFinish={async values => { const result = await createClubApi(values); if (result?.EC === 0) { setClubOpen(false); clubForm.resetFields(); load(); } else message.error(result?.EM); }}>
        <Form.Item name="name" label="Tên" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="description" label="Mô tả"><Input.TextArea /></Form.Item>
        <Form.Item name="capacity" label="Sức chứa" initialValue={50}><InputNumber min={1} /></Form.Item>
      </Form>
    </Modal>
  </Card>;
}
