import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  message,
  Popconfirm,
  DatePicker,
} from 'antd';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import {
  createUserApi,
  deleteUserApi,
  getAssignableRolesApi,
  getUsersApi,
  resetUserPasswordApi,
  updateUserApi,
} from '../../api';
import ImportExcelButton from '../../components/ImportExcelButton';
import { ROLE_LABELS, canManageLevel } from '../../constants/roles';
import RolesPage from '../roles/RolesPage';

const UsersPage = () => {
  const me = useSelector((s) => s.auth.user);
  const myLevel = me?.roleLevel ?? 0;
  const canManageRoles =
    me?.role === 'SUPER_ADMIN' ||
    (me?.permissions || []).includes('MANAGE_ROLES') ||
    (me?.permissionEntries || []).some(
      (p) => p.resource === 'roles' && (p.actions || []).includes('view')
    );

  const [rows, setRows] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = async () => {
    const [usersRes, rolesRes] = await Promise.all([getUsersApi(), getAssignableRolesApi()]);
    if (usersRes?.EC === 0) setRows(usersRes.data || []);
    else message.error(usersRes?.EM);
    if (rolesRes?.EC === 0) {
      setRoleOptions(
        (rolesRes.data || []).map((r) => ({
          value: r.code,
          label: `${r.name} (L${r.level})`,
          level: r.level,
        }))
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  const canManageRow = (user) => {
    const level = user.roleLevel ?? roleOptions.find((o) => o.value === user.role)?.level;
    if (level == null) return false;
    return canManageLevel(me?.role, myLevel, level);
  };

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      dateOfBirth: values.dateOfBirth ? values.dateOfBirth.toISOString() : undefined,
    };
    if (editing) {
      delete payload.password;
    }
    const res = editing
      ? await updateUserApi(editing._id, payload)
      : await createUserApi(payload);
    if (res?.EC === 0) {
      message.success(res.EM);
      setOpen(false);
      form.resetFields();
      load();
    } else message.error(res?.EM);
  };

  const onResetPassword = async (userId) => {
    const res = await resetUserPasswordApi(userId);
    if (res?.EC === 0) {
      message.success(res.EM || 'Đã reset mật khẩu mặc định');
    } else message.error(res?.EM);
  };

  const roleLabelMap = useMemo(() => {
    const map = { ...ROLE_LABELS };
    roleOptions.forEach((o) => {
      map[o.value] = o.label.replace(/\s*\(L\d+\)$/, '');
    });
    return map;
  }, [roleOptions]);

  const usersTab = (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          onClick={() => {
            setEditing(null);
            form.resetFields();
            setOpen(true);
          }}
        >
          Thêm người dùng
        </Button>
        <ImportExcelButton type="users" onDone={load} label="Import Excel" />
      </Space>
      <Table
        rowKey="_id"
        dataSource={rows}
        columns={[
          { title: 'Mã', dataIndex: 'code' },
          { title: 'Họ tên', dataIndex: 'name' },
          { title: 'Email', dataIndex: 'email' },
          {
            title: 'Vai trò',
            dataIndex: 'role',
            render: (v, r) => r.roleLabel || roleLabelMap[v] || v,
          },
          {
            title: 'Trường',
            render: (_, r) => r.schoolId?.name || '—',
          },
          { title: 'Trạng thái', dataIndex: 'status' },
          {
            title: 'Thao tác',
            width: 260,
            fixed: 'right',
            render: (_, r) =>
              canManageRow(r) ? (
                <Space size={8} style={{ whiteSpace: 'nowrap' }}>
                  <Button
                    size="small"
                    onClick={() => {
                      setEditing(r);
                      form.setFieldsValue({
                        name: r.name,
                        email: r.email,
                        phone: r.phone,
                        address: r.address,
                        role: r.role,
                        status: r.status,
                        code: r.code,
                        gender: r.gender,
                        bio: r.bio,
                        dateOfBirth: r.dateOfBirth ? dayjs(r.dateOfBirth) : null,
                      });
                      setOpen(true);
                    }}
                  >
                    Sửa
                  </Button>
                  <Popconfirm
                    title="Reset mật khẩu về mặc định?"
                    description="Mật khẩu sẽ về giá trị DEFAULT_PASSWORD trong .env (thường là Password@123)."
                    onConfirm={() => onResetPassword(r._id)}
                  >
                    <Button size="small">Reset MK</Button>
                  </Popconfirm>
                  <Popconfirm
                    title="Xóa user?"
                    onConfirm={async () => {
                      const res = await deleteUserApi(r._id);
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
              ) : (
                '—'
              ),
          },
        ]}
        scroll={{ x: 1100 }}
      />
      <Modal
        open={open}
        title={editing ? 'Cập nhật người dùng' : 'Thêm người dùng'}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item name="name" label="Họ tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="ten@truong.edu.vn hoặc ten@gmail.com" />
          </Form.Item>
          {!editing && (
            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[{ required: true, min: 6 }]}
              extra="Chỉ nhập khi tạo mới. Khi sửa chỉ được Reset mật khẩu mặc định."
            >
              <Input.Password />
            </Form.Item>
          )}
          {editing && (
            <Popconfirm
              title="Reset mật khẩu về mặc định?"
              description="Mật khẩu sẽ về DEFAULT_PASSWORD (thường Password@123)."
              onConfirm={() => onResetPassword(editing._id)}
            >
              <Button style={{ marginBottom: 16 }}>Reset mật khẩu mặc định</Button>
            </Popconfirm>
          )}
          <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
            <Select options={roleOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="code" label="Mã">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Điện thoại">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ">
            <Input />
          </Form.Item>
          <Form.Item name="gender" label="Giới tính">
            <Select
              allowClear
              options={[
                { value: 'Male', label: 'Nam' },
                { value: 'Female', label: 'Nữ' },
                { value: 'Other', label: 'Khác' },
              ]}
            />
          </Form.Item>
          <Form.Item name="dateOfBirth" label="Ngày sinh">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="bio" label="Giới thiệu">
            <Input.TextArea rows={2} />
          </Form.Item>
          {editing && (
            <Form.Item name="status" label="Trạng thái">
              <Select
                options={[
                  { value: 'ACTIVE', label: 'ACTIVE' },
                  { value: 'INACTIVE', label: 'INACTIVE' },
                  { value: 'SUSPENDED', label: 'SUSPENDED' },
                ]}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );

  if (!canManageRoles) return usersTab;

  return (
    <Tabs
      items={[
        { key: 'users', label: 'Người dùng', children: usersTab },
        { key: 'roles', label: 'Vai trò', children: <RolesPage /> },
      ]}
    />
  );
};

export default UsersPage;
