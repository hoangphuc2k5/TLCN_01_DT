import { useEffect, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Select, Table, Tabs, Tag, message } from 'antd';
import dayjs from 'dayjs';
import {
  createSubInvoiceApi,
  getSchoolsApi,
  getSubInvoicesApi,
  getSubscriptionsApi,
  markSubInvoicePaidApi,
  upsertSubscriptionApi,
} from '../../api';

const SubscriptionsPage = () => {
  const [subs, setSubs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [schools, setSchools] = useState([]);
  const [open, setOpen] = useState(false);
  const [openInv, setOpenInv] = useState(false);
  const [form] = Form.useForm();
  const [invForm] = Form.useForm();

  const load = async () => {
    const [s, i, sc] = await Promise.all([
      getSubscriptionsApi(),
      getSubInvoicesApi(),
      getSchoolsApi(),
    ]);
    if (s?.EC === 0) setSubs(s.data || []);
    if (i?.EC === 0) setInvoices(i.data || []);
    if (sc?.EC === 0) setSchools(sc.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <Tabs
        items={[
          {
            key: 'subs',
            label: 'Gói dịch vụ',
            children: (
              <>
                <Button type="primary" style={{ marginBottom: 16 }} onClick={() => setOpen(true)}>
                  Gán / cập nhật gói
                </Button>
                <Table
                  rowKey="_id"
                  dataSource={subs}
                  columns={[
                    { title: 'Trường', render: (_, r) => r.schoolId?.name },
                    { title: 'Gói', dataIndex: 'plan', render: (v) => <Tag color="blue">{v}</Tag> },
                    { title: 'HS tối đa', dataIndex: 'maxStudents' },
                    { title: 'GV tối đa', dataIndex: 'maxTeachers' },
                    { title: 'Storage (GB)', dataIndex: 'storageGb' },
                    {
                      title: 'Hết hạn',
                      dataIndex: 'expiresAt',
                      render: (v) => (v ? dayjs(v).format('DD/MM/YYYY') : '—'),
                    },
                    { title: 'TT', dataIndex: 'status' },
                  ]}
                />
              </>
            ),
          },
          {
            key: 'invoices',
            label: 'Hóa đơn gia hạn',
            children: (
              <>
                <Button type="primary" style={{ marginBottom: 16 }} onClick={() => setOpenInv(true)}>
                  Tạo hóa đơn
                </Button>
                <Table
                  rowKey="_id"
                  dataSource={invoices}
                  columns={[
                    { title: 'Trường', render: (_, r) => r.schoolId?.name },
                    { title: 'Gói', dataIndex: 'plan' },
                    {
                      title: 'Số tiền',
                      dataIndex: 'amount',
                      render: (v) => Number(v).toLocaleString('vi-VN'),
                    },
                    {
                      title: 'Kỳ',
                      render: (_, r) =>
                        `${dayjs(r.periodStart).format('DD/MM/YY')} - ${dayjs(r.periodEnd).format('DD/MM/YY')}`,
                    },
                    {
                      title: 'TT',
                      dataIndex: 'status',
                      render: (v) => <Tag color={v === 'PAID' ? 'green' : 'orange'}>{v}</Tag>,
                    },
                    {
                      title: 'Thao tác',
                      render: (_, r) =>
                        r.status !== 'PAID' ? (
                          <Button
                            size="small"
                            onClick={async () => {
                              const res = await markSubInvoicePaidApi(r._id);
                              if (res?.EC === 0) {
                                message.success(res.EM);
                                load();
                              } else message.error(res?.EM);
                            }}
                          >
                            Đánh dấu đã thu
                          </Button>
                        ) : null,
                    },
                  ]}
                />
              </>
            ),
          },
        ]}
      />

      <Modal open={open} title="Gói dịch vụ" onCancel={() => setOpen(false)} onOk={() => form.submit()}>
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            const res = await upsertSubscriptionApi(v);
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpen(false);
              form.resetFields();
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="schoolId" label="Trường" rules={[{ required: true }]}>
            <Select options={schools.map((s) => ({ value: s._id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="plan" label="Gói" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'FREE', label: 'FREE' },
                { value: 'BASIC', label: 'BASIC' },
                { value: 'PREMIUM', label: 'PREMIUM' },
              ]}
            />
          </Form.Item>
          <Form.Item name="expiresAt" label="Hết hạn">
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={openInv} title="Hóa đơn gia hạn" onCancel={() => setOpenInv(false)} onOk={() => invForm.submit()}>
        <Form
          form={invForm}
          layout="vertical"
          onFinish={async (v) => {
            const res = await createSubInvoiceApi(v);
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpenInv(false);
              invForm.resetFields();
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="subscriptionId" label="Subscription" rules={[{ required: true }]}>
            <Select
              options={subs.map((s) => ({
                value: s._id,
                label: `${s.schoolId?.name || s.schoolId} — ${s.plan}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="amount" label="Số tiền">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SubscriptionsPage;
