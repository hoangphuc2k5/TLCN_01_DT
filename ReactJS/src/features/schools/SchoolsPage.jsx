import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Table, message, Popconfirm } from 'antd';
import { useSelector } from 'react-redux';
import {
  createSchoolApi,
  deleteSchoolApi,
  getClustersApi,
  getSchoolsApi,
  updateSchoolApi,
} from '../../api';
import { ROLES } from '../../constants/roles';

const SchoolsPage = () => {
  const { user } = useSelector((s) => s.auth);
  const [rows, setRows] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const canManage = [ROLES.SUPER_ADMIN, ROLES.CLUSTER_ADMIN].includes(user?.role);
  const canDelete = user?.role === ROLES.SUPER_ADMIN;

  const load = async () => {
    const res = await getSchoolsApi();
    if (res?.EC === 0) setRows(res.data || []);
    else message.error(res?.EM);
    if (user?.role === ROLES.SUPER_ADMIN) {
      const c = await getClustersApi();
      if (c?.EC === 0) setClusters(c.data || []);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (values) => {
    const res = editing
      ? await updateSchoolApi(editing._id, values)
      : await createSchoolApi(values);
    if (res?.EC === 0) {
      message.success(res.EM);
      setOpen(false);
      form.resetFields();
      load();
    } else message.error(res?.EM);
  };

  return (
    <div>
      {canManage && (
        <Space style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              form.resetFields();
              if (user?.role === ROLES.SUPER_ADMIN) {
                form.setFieldsValue({ status: 'ACTIVE' });
              }
              setOpen(true);
            }}
          >
            Thêm trường
          </Button>
        </Space>
      )}
      <Table
        rowKey="_id"
        dataSource={rows}
        columns={[
          { title: 'Mã', dataIndex: 'code' },
          { title: 'Tên', dataIndex: 'name' },
          { title: 'Subdomain', dataIndex: 'subdomain' },
          {
            title: 'Cụm',
            dataIndex: ['clusterId', 'name'],
            render: (_, r) => r.clusterId?.name || r.clusterId || '—',
          },
          { title: 'Địa chỉ', dataIndex: 'address' },
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
                      name: r.name,
                      address: r.address,
                      phone: r.phone,
                      email: r.email,
                      status: r.status || 'ACTIVE',
                      clusterId: r.clusterId?._id || r.clusterId,
                      code: r.code,
                      subdomain: r.subdomain,
                    });
                    setOpen(true);
                  }}
                >
                  Sửa
                </Button>
                {canDelete && (
                  <Popconfirm
                    title="Xóa trường?"
                    onConfirm={async () => {
                      const res = await deleteSchoolApi(r._id);
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
                )}
              </Space>
            ),
          },
        ]}
      />
      <Modal
        open={open}
        title={editing ? 'Cập nhật trường' : 'Thêm trường'}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          {!editing && (
            <>
              <Form.Item name="code" label="Mã" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="subdomain" label="Subdomain" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </>
          )}
          <Form.Item name="name" label="Tên trường" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Điện thoại">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input />
          </Form.Item>
          {user?.role === ROLES.SUPER_ADMIN && (
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
          )}
          {user?.role === ROLES.SUPER_ADMIN && (
            <Form.Item name="clusterId" label="Cụm">
              <Select
                allowClear
                options={clusters.map((c) => ({ value: c._id, label: c.name }))}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default SchoolsPage;
