import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Table, message, Popconfirm } from 'antd';
import { createClusterApi, deleteClusterApi, getClustersApi, updateClusterApi } from '../../api';

const ClustersPage = () => {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = async () => {
    const res = await getClustersApi();
    if (res?.EC === 0) setRows(res.data || []);
    else message.error(res?.EM || 'Lỗi tải cụm');
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (values) => {
    const res = editing
      ? await updateClusterApi(editing._id, values)
      : await createClusterApi(values);
    if (res?.EC === 0) {
      message.success(res.EM);
      setOpen(false);
      setEditing(null);
      form.resetFields();
      load();
    } else message.error(res?.EM || 'Thất bại');
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          onClick={() => {
            setEditing(null);
            form.resetFields();
            form.setFieldsValue({ status: 'ACTIVE' });
            setOpen(true);
          }}
        >
          Thêm cụm
        </Button>
      </Space>
      <Table
        rowKey="_id"
        dataSource={rows}
        columns={[
          { title: 'Mã', dataIndex: 'code' },
          { title: 'Tên', dataIndex: 'name' },
          { title: 'Mô tả', dataIndex: 'description' },
          { title: 'Trạng thái', dataIndex: 'status' },
          {
            title: 'Thao tác',
            render: (_, r) => (
              <Space>
                <Button
                  size="small"
                  onClick={() => {
                    setEditing(r);
                    form.setFieldsValue({
                      code: r.code,
                      name: r.name,
                      description: r.description,
                      status: r.status || 'ACTIVE',
                    });
                    setOpen(true);
                  }}
                >
                  Sửa
                </Button>
                <Popconfirm
                  title="Xóa cụm?"
                  onConfirm={async () => {
                    const res = await deleteClusterApi(r._id);
                    if (res?.EC === 0) {
                      message.success(res.EM);
                      load();
                    } else message.error(res?.EM);
                  }}
                >
                  <Button size="small" danger>
                    Xóa
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        open={open}
        title={editing ? 'Sửa cụm' : 'Thêm cụm'}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item name="code" label="Mã" rules={[{ required: true }]}>
            <Input disabled={!!editing} />
          </Form.Item>
          <Form.Item name="name" label="Tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'ACTIVE', label: 'ACTIVE — Đang hoạt động' },
                { value: 'INACTIVE', label: 'INACTIVE — Ngưng' },
                { value: 'SUSPENDED', label: 'SUSPENDED — Tạm khóa' },
                { value: 'PENDING', label: 'PENDING — Chờ duyệt' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClustersPage;
