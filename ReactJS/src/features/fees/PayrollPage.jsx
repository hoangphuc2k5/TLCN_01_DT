import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd';
import { useSelector } from 'react-redux';
import { createPayrollApi, getPayrollApi, getUserDirectoryApi, updatePayrollStatusApi } from '../../api';
import { can } from '../../util/permissions';

const PayrollPage = () => {
  const { user } = useSelector(s => s.auth); const manage = can(user, 'fees', 'create'); const execute = can(user, 'fees', 'execute');
  const [rows, setRows] = useState([]); const [employees, setEmployees] = useState([]); const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false); const [form] = Form.useForm();
  const load = async () => { const result = await getPayrollApi(); if (result?.EC === 0) setRows(result.data || []); };
  useEffect(() => { load(); if (manage) getUserDirectoryApi({ limit: 300 }).then(result => result?.EC === 0 && setEmployees((result.data || []).filter(item => !['STUDENT', 'PARENT'].includes(item.role)))); }, []);
  const update = async (row, status) => { const result = await updatePayrollStatusApi(row._id, status); if (result?.EC === 0) { message.success(result.EM); load(); } else message.error(result?.EM); };
  return <Card title="Payroll" extra={manage && <Button type="primary" onClick={() => setOpen(true)}>New payroll</Button>}>
    <Table rowKey="_id" dataSource={rows} columns={[{ title: 'Employee', render: (_, row) => row.employeeId?.name || row.employeeId?.email }, { title: 'Period', dataIndex: 'period' }, { title: 'Net amount', dataIndex: 'netAmount', render: value => Number(value).toLocaleString('vi-VN') }, { title: 'Status', dataIndex: 'status', render: value => <Tag>{value}</Tag> }, execute ? { title: 'Actions', render: (_, row) => <Space>{row.status === 'DRAFT' && <Button size="small" onClick={() => update(row, 'APPROVED')}>Approve</Button>}{row.status === 'APPROVED' && <Button size="small" type="primary" onClick={() => update(row, 'PAID')}>Mark paid</Button>}</Space> } : {}].filter(item => item.title)} />
    <Modal open={open} title="New payroll" confirmLoading={saving} onCancel={() => !saving && setOpen(false)} onOk={() => form.submit()}>
      <Form form={form} layout="vertical" onFinish={async values => { setSaving(true); try { const result = await createPayrollApi(values); if (result?.EC !== 0) return message.error(result?.EM); message.success(result.EM || 'Created'); setOpen(false); form.resetFields(); load(); } catch (error) { message.error(error.message); } finally { setSaving(false); } }}>
        <Form.Item name="employeeId" label="Employee" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={employees.map(item => ({ value: item._id, label: `${item.name} (${item.role})` }))} /></Form.Item>
        <Form.Item name="period" label="Period" rules={[{ required: true }]}><Input type="month" /></Form.Item>
        <Form.Item name="baseSalary" label="Base salary" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="allowances" label="Allowances" initialValue={0}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="deductions" label="Deductions" initialValue={0}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="note" label="Note"><Input.TextArea maxLength={1000} /></Form.Item>
      </Form>
    </Modal>
  </Card>;
};
export default PayrollPage;
