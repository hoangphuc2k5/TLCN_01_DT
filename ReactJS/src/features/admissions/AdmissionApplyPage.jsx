import { useState } from 'react';
import { Alert, Button, Card, Form, Input, InputNumber, Space, Typography, message } from 'antd';
import { createAdmissionApi, getAdmissionStatusApi } from '../../api';

const AdmissionApplyPage = () => {
  const [result, setResult] = useState(null); const [status, setStatus] = useState(null); const [form] = Form.useForm();
  return <div style={{ maxWidth: 720, margin: '32px auto' }}><Typography.Title level={2}>Tuyen sinh online</Typography.Title>
    <Card title="Nop ho so"><Form form={form} layout="vertical" onFinish={async values => { const r = await createAdmissionApi(values); if (r?.EC === 0) { setResult(r.data); form.resetFields(); message.success('Da nop ho so'); } else message.error(r?.EM); }}>
      <Form.Item name="schoolCode" label="Ma truong/subdomain" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="applicantName" label="Ho ten hoc sinh" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="dateOfBirth" label="Ngay sinh" rules={[{ required: true }]}><Input type="date" /></Form.Item><Form.Item name="guardianName" label="Ho ten phu huynh" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="guardianPhone" label="So dien thoai" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="guardianEmail" label="Email"><Input type="email" /></Form.Item><Form.Item name="requestedGrade" label="Khoi dang ky" rules={[{ required: true }]}><InputNumber min={1} max={12} /></Form.Item><Form.Item name="previousSchool" label="Truong cu"><Input /></Form.Item><Form.Item name="note" label="Ghi chu"><Input.TextArea maxLength={2000} /></Form.Item><Button type="primary" htmlType="submit">Nop ho so</Button>
    </Form></Card>
    {result && <Alert style={{ marginTop: 16 }} type="success" message={`Ma tra cuu: ${result.trackingCode}`} description="Luu ma nay de theo doi ket qua tuyen sinh." />}
    <Card style={{ marginTop: 16 }} title="Tra cuu ho so"><Space.Compact style={{ width: '100%' }}><Input id="tracking-code" placeholder="ADM-..." /><Button onClick={async () => { const code = document.getElementById('tracking-code').value; if (!code) return; const r = await getAdmissionStatusApi(code); if (r?.EC === 0) setStatus(r.data); else message.error(r?.EM); }}>Tra cuu</Button></Space.Compact>{status && <Alert style={{ marginTop: 12 }} type="info" message={`${status.applicantName} - ${status.status}`} description={status.reviewNote || 'Ho so dang duoc xu ly'} />}</Card>
  </div>;
};
export default AdmissionApplyPage;
