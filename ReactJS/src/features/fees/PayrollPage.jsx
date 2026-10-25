import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd';
import { useSelector } from 'react-redux';
import { createPayrollApi, getPayrollApi, getUserDirectoryApi, updatePayrollStatusApi } from '../../services/api.service';
import { can } from '../../utils/permissions';

const PayrollPage = () => {
  const { user } = useSelector(s => s.auth); const manage = can(user, 'fees', 'create'); const execute = can(user, 'fees', 'execute');
  const [rows, setRows] = useState([]); const [employees, setEmployees] = useState([]); const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false); const [loading, setLoading] = useState(false); const [form] = Form.useForm();
  const load = async () => { setLoading(true); try { const result = await getPayrollApi(); if (result?.EC === 0) setRows(result.data || []); } finally { setLoading(false); } };
  useEffect(() => { load(); if (manage) getUserDirectoryApi({ limit: 300 }).then(result => result?.EC === 0 && setEmployees((result.data || []).filter(item => !['STUDENT', 'PARENT'].includes(item.role)))); }, []);
  const update = async (row, status) => { const result = await updatePayrollStatusApi(row._id, status); if (result?.EC === 0) { message.success(result.EM); load(); } else message.error(result?.EM); };
  const statusLabels = { DRAFT: 'Bản nháp', APPROVED: 'Đã duyệt', PAID: 'Đã thanh toán' };
  return <Card title="Bảng lương" extra={manage && <Button type="primary" onClick={() => setOpen(true)}>Tạo bảng lương</Button>}>
    <Table loading={loading} rowKey="_id" dataSource={rows} columns={[{ title: 'Nhân viên', render: (_, row) => row.employeeId?.name || row.employeeId?.email }, { title: 'Kỳ lương', dataIndex: 'period' }, { title: 'Thực lĩnh', dataIndex: 'netAmount', render: value => `${Number(value).toLocaleString('vi-VN')} ₫` }, { title: 'Trạng thái', dataIndex: 'status', render: value => <Tag color={value === 'PAID' ? 'green' : value === 'APPROVED' ? 'blue' : 'default'}>{statusLabels[value] || value}</Tag> }, execute ? { title: 'Thao tác', render: (_, row) => <Space>{row.status === 'DRAFT' && String(row.createdBy?._id || row.createdBy) !== String(user?._id) && <Button size="small" onClick={() => update(row, 'APPROVED')}>Duyệt</Button>}{row.status === 'APPROVED' && <Button size="small" type="primary" onClick={() => update(row, 'PAID')}>Đánh dấu đã thanh toán</Button>}</Space> } : {}].filter(item => item.title)} />
    <Modal open={open} title="Tạo bảng lương" confirmLoading={saving} onCancel={() => !saving && setOpen(false)} onOk={() => form.submit()}>
      <Form form={form} layout="vertical" onFinish={async values => { setSaving(true); try { const result = await createPayrollApi(values); if (result?.EC !== 0) return message.error(result?.EM); message.success(result.EM || 'Created'); setOpen(false); form.resetFields(); load(); } catch (error) { message.error(error.message); } finally { setSaving(false); } }}>
        <Form.Item name="employeeId" label="Nhân viên" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={employees.map(item => ({ value: item._id, label: `${item.name} (${item.role})` }))} /></Form.Item>
        <Form.Item name="period" label="Kỳ lương" rules={[{ required: true }]}><Input type="month" /></Form.Item>
        <Form.Item name="baseSalary" label="Lương cơ bản" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="allowances" label="Phụ cấp" initialValue={0}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="deductions" label="Khấu trừ" initialValue={0}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="note" label="Ghi chú"><Input.TextArea maxLength={1000} /></Form.Item>
      </Form>
    </Modal>
  </Card>;
};
export default PayrollPage;
