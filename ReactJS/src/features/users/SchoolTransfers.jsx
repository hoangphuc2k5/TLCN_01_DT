import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Button, DatePicker, Descriptions, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import axios from '../../config/http-client';
import { getClassesApi, getUsersApi } from '../../services/api.service';
import { can } from '../../utils/permissions';

const labels = { PENDING: 'Chờ trường đi duyệt', APPROVED: 'Chờ tiếp nhận', ACCEPTED: 'Đã tiếp nhận', REJECTED: 'Đã từ chối', CANCELLED: 'Đã hủy' };
const SchoolTransfers = () => {
  const me = useSelector(state => state.auth.user);
  const [rows, setRows] = useState([]);
  const [schools, setSchools] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [creating, setCreating] = useState(false);
  const [decision, setDecision] = useState(null);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form] = Form.useForm();
  const [decisionForm] = Form.useForm();
  const load = async () => {
    try {
      const result = await axios.get('/v1/api/school-transfers');
      if (result?.EC !== 0) return message.error(result?.EM || 'Không tải được yêu cầu');
      setRows(result.data || []);
    } catch (error) { message.error(error.message); }
  };
  useEffect(() => { load(); }, []);
  const manages = school => me.role === 'SUPER_ADMIN' || (me.role === 'CLUSTER_ADMIN'
    ? me.clusterId && String(me.clusterId?._id || me.clusterId) === String(school?.clusterId?._id || school?.clusterId)
    : String(me.schoolId?._id || me.schoolId) === String(school?._id || school));
  const startCreate = async () => {
    try {
      const [schoolRes, studentRes] = await Promise.all([axios.get('/v1/api/school-transfers/schools'), getUsersApi({ role: 'STUDENT', limit: 1000 })]);
      if (schoolRes?.EC !== 0 || studentRes?.EC !== 0) return message.error(schoolRes?.EM || studentRes?.EM);
      setSchools(schoolRes.data || []); setStudents((studentRes.data || []).filter(s => s.status === 'ACTIVE'));
      form.resetFields(); setCreating(true);
    } catch (error) { message.error(error.message); }
  };
  const startDecision = async (row, action) => {
    try {
      if (action === 'accept') {
        const result = await getClassesApi({ schoolId: row.toSchoolId._id, limit: 200 });
        if (result?.EC !== 0) return message.error(result?.EM);
        setClasses((result.data || []).filter(c => c.status === 'ACTIVE' && c.gradeLevel === row.gradeLevel && String(c.schoolId?._id || c.schoolId) === row.toSchoolId._id));
      }
      decisionForm.resetFields(); setDecision({ row, action });
    } catch (error) { message.error(error.message); }
  };
  const submit = async (url, values, close) => {
    setBusy(true);
    try {
      const result = await axios.post(url, values);
      if (result?.EC !== 0) return message.error(result?.EM || 'Không xử lý được yêu cầu');
      message.success(result.EM); close(); await load();
    } catch (error) { message.error(error.message); }
    finally { setBusy(false); }
  };
  return <>
    <Alert type="info" showIcon message="Học sinh vẫn thuộc trường cũ cho đến khi trường đến tiếp nhận. Điểm và học phí cũ được giữ nguyên; hồ sơ điểm bàn giao được lưu khi tiếp nhận." style={{ marginBottom: 16 }} />
    <Space style={{ marginBottom: 16 }}>
      {can(me, 'users', 'create') && <Button type="primary" onClick={startCreate}>Tạo yêu cầu chuyển trường</Button>}
      <Button onClick={load}>Tải lại</Button>
    </Space>
    <Table rowKey="_id" dataSource={rows} scroll={{ x: 1000 }} columns={[
      { title: 'Học sinh', dataIndex: 'studentName' },
      { title: 'Trường đi', render: (_, r) => r.fromSchoolId?.name },
      { title: 'Trường đến', render: (_, r) => r.toSchoolId?.name },
      { title: 'Ngày dự kiến', render: (_, r) => new Date(r.requestedDate).toLocaleDateString('vi-VN') },
      { title: 'Trạng thái', render: (_, r) => <Tag>{labels[r.status]}</Tag> },
      { title: 'Thao tác', render: (_, r) => <Space wrap>
        <Button size="small" onClick={async () => {
          try { const result = await axios.get(`/v1/api/school-transfers/${r._id}`); if (result?.EC === 0) setDetail(result.data); else message.error(result?.EM); }
          catch (error) { message.error(error.message); }
        }}>Chi tiết</Button>
        {can(me, 'users', 'update') && r.open && <>
          {r.status === 'PENDING' && manages(r.fromSchoolId) && <Button size="small" onClick={() => startDecision(r, 'approve')}>Duyệt chuyển đi</Button>}
          {r.status === 'APPROVED' && manages(r.toSchoolId) && <Button size="small" type="primary" onClick={() => startDecision(r, 'accept')}>Tiếp nhận</Button>}
          {manages(r.status === 'PENDING' ? r.fromSchoolId : r.toSchoolId) && <Button size="small" danger onClick={() => startDecision(r, 'reject')}>Từ chối</Button>}
          {manages(r.fromSchoolId) && <Button size="small" onClick={() => startDecision(r, 'cancel')}>Hủy yêu cầu</Button>}
        </>}
      </Space> },
    ]} />
    <Modal open={creating} title="Tạo yêu cầu chuyển trường" okText="Tạo yêu cầu" cancelText="Hủy" onCancel={() => setCreating(false)} onOk={() => form.submit()} confirmLoading={busy}>
      <Form form={form} layout="vertical" onFinish={values => submit('/v1/api/school-transfers', { ...values, requestedDate: values.requestedDate.toISOString() }, () => setCreating(false))}>
        <Form.Item name="studentId" label="Học sinh" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={students.map(s => ({ value: s._id, label: `${s.name} (${s.code || s.email})` }))} /></Form.Item>
        <Form.Item name="toSchoolId" label="Trường đến" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={schools.map(s => ({ value: s._id, label: `${s.name} (${s.code})` }))} /></Form.Item>
        <Form.Item name="requestedDate" label="Ngày dự kiến chuyển" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" /></Form.Item>
        <Form.Item name="reason" label="Lý do" rules={[{ required: true, whitespace: true, max: 1000 }]}><Input.TextArea maxLength={1000} /></Form.Item>
      </Form>
    </Modal>
    <Modal open={!!decision} title={{ approve: 'Duyệt chuyển đi và bàn giao hồ sơ', accept: 'Xác nhận tiếp nhận học sinh', reject: 'Từ chối yêu cầu', cancel: 'Hủy yêu cầu' }[decision?.action]} okText="Xác nhận" cancelText="Đóng" onCancel={() => setDecision(null)} onOk={() => decisionForm.submit()} confirmLoading={busy}>
      <Form form={decisionForm} layout="vertical" onFinish={values => submit(`/v1/api/school-transfers/${decision.row._id}/decision`, { ...values, action: decision.action }, () => setDecision(null))}>
        <p>{decision?.row.studentName} — {decision?.row.fromSchoolId?.name} → {decision?.row.toSchoolId?.name}</p>
        {decision?.action === 'accept' && <Form.Item name="classId" label="Lớp tiếp nhận cùng khối" rules={[{ required: true }]}><Select options={classes.map(c => ({ value: c._id, label: c.name }))} /></Form.Item>}
        {['reject', 'cancel'].includes(decision?.action) && <Form.Item name="note" label="Lý do" rules={[{ required: true, whitespace: true, max: 1000 }]}><Input.TextArea maxLength={1000} /></Form.Item>}
        {decision?.action === 'accept' && <Alert type="warning" message="Tiếp nhận có hiệu lực ngay và thu hồi phiên đăng nhập cũ của học sinh. Liên kết phụ huynh được giữ; tài khoản phụ huynh khác trường cần quản trị viên rà soát quyền riêng." />}
      </Form>
    </Modal>
    <Modal open={!!detail} title="Hồ sơ chuyển trường" onCancel={() => setDetail(null)} footer={null} width={850}>
      {detail && <>
        <Descriptions column={1} items={[{ key: 'student', label: 'Học sinh', children: detail.studentName }, { key: 'status', label: 'Trạng thái', children: labels[detail.status] }, { key: 'reason', label: 'Lý do', children: detail.reason }]} />
        <h3>Lịch sử xử lý</h3>
        {(detail.history || []).map(h => <p key={h._id}>{new Date(h.at).toLocaleString('vi-VN')} — {h.action} — {h.note}</p>)}
        {detail.handover && <><h3>Điểm bàn giao</h3><Table rowKey="_id" size="small" dataSource={detail.handover.grades || []} columns={[
          { title: 'Năm học', render: (_, r) => r.academicYearId?.name }, { title: 'Lớp', render: (_, r) => r.classId?.name },
          { title: 'Môn', render: (_, r) => r.subjectId?.name }, { title: 'Học kỳ', dataIndex: 'semester' }, { title: 'Trung bình', dataIndex: 'average' },
          { title: 'Điểm', render: (_, r) => (r.scores || []).map(s => `${s.type}: ${s.score}`).join(', ') },
        ]} /></>}
      </>}
    </Modal>
  </>;
};
export default SchoolTransfers;
