import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Select, Table, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { createTicketApi, getTicketsApi, updateTicketApi } from '../../api';
import { ROLES } from '../../constants/roles';

const SupportPage = () => {
  const { user } = useSelector((s) => s.auth);
  const isSuper = user?.role === ROLES.SUPER_ADMIN;
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    const res = await getTicketsApi();
    if (res?.EC === 0) setRows(res.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      {!isSuper && (
        <Button type="primary" style={{ marginBottom: 16 }} onClick={() => setOpen(true)}>
          Tạo ticket hỗ trợ
        </Button>
      )}
      <Table
        rowKey="_id"
        dataSource={rows}
        columns={[
          { title: 'Tiêu đề', dataIndex: 'title' },
          { title: 'Trường', render: (_, r) => r.schoolId?.name || '—' },
          { title: 'Người gửi', render: (_, r) => r.createdBy?.name },
          { title: 'Loại', dataIndex: 'category' },
          { title: 'Ưu tiên', dataIndex: 'priority' },
          {
            title: 'TT',
            dataIndex: 'status',
            render: (v) => <Tag color={v === 'RESOLVED' ? 'green' : 'gold'}>{v}</Tag>,
          },
          {
            title: 'Ngày',
            dataIndex: 'createdAt',
            render: (v) => dayjs(v).format('DD/MM/YYYY'),
          },
          isSuper
            ? {
                title: 'Xử lý',
                render: (_, r) =>
                  r.status !== 'CLOSED' && r.status !== 'RESOLVED' ? (
                    <Select
                      size="small"
                      style={{ width: 140 }}
                      placeholder="Cập nhật"
                      options={[
                        { value: 'IN_PROGRESS', label: 'Đang xử lý' },
                        { value: 'RESOLVED', label: 'Đã xử lý' },
                        { value: 'CLOSED', label: 'Đóng' },
                      ]}
                      onChange={async (status) => {
                        const res = await updateTicketApi(r._id, {
                          status,
                          resolution: status === 'RESOLVED' ? 'Đã xử lý bởi Super Admin' : '',
                        });
                        if (res?.EC === 0) {
                          message.success(res.EM);
                          load();
                        } else message.error(res?.EM);
                      }}
                    />
                  ) : null,
              }
            : {},
        ].filter((c) => c.title)}
        expandable={{
          expandedRowRender: (r) => (
            <div>
              <p>{r.description}</p>
              {r.resolution ? <p><strong>Giải pháp:</strong> {r.resolution}</p> : null}
            </div>
          ),
        }}
      />
      <Modal open={open} title="Ticket hỗ trợ" onCancel={() => setOpen(false)} onOk={() => form.submit()}>
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            const res = await createTicketApi(v);
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpen(false);
              form.resetFields();
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Mô tả" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="category" label="Loại" initialValue="TECHNICAL">
            <Select
              options={[
                { value: 'TECHNICAL', label: 'Kỹ thuật' },
                { value: 'BILLING', label: 'Thanh toán' },
                { value: 'ACCOUNT', label: 'Tài khoản' },
                { value: 'OTHER', label: 'Khác' },
              ]}
            />
          </Form.Item>
          <Form.Item name="priority" label="Ưu tiên" initialValue="MEDIUM">
            <Select
              options={[
                { value: 'LOW', label: 'Thấp' },
                { value: 'MEDIUM', label: 'Trung bình' },
                { value: 'HIGH', label: 'Cao' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SupportPage;
