import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Form,
  Input,
  Modal,  Space,
  Table,
  Tabs,
  message,
  Popconfirm,} from 'antd';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import {
  createUserApi,
  deleteUserApi,
  getAssignableRolesApi,
  getUsersApi,
  resetUserPasswordApi,
  updateUserApi,
  getClassesApi,
} from '../../services/api.service';
import ImportExcelButton from '../../components/ImportExcelButton';
import { ROLE_LABELS, canManageLevel } from '../../constants/roles';
import { can } from '../../utils/permissions';
import UserDialogs from './UserDialogs';
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
  const [transferStudent, setTransferStudent] = useState(null);
  const [transferClasses, setTransferClasses] = useState([]);
  const [transferring, setTransferring] = useState(false);
  const [transferForm] = Form.useForm();

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
      Modal.success({ title: 'Mật khẩu tạm mới', content: <div><p>Gửi riêng cho người dùng. Người dùng phải đổi mật khẩu sau khi đăng nhập; các phiên cũ đã bị thu hồi.</p><Input readOnly value={res.data.defaultPassword} onFocus={event => event.target.select()} /></div> });
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
          disabled={!can(me, 'users', 'create')}
          onClick={() => {
            setEditing(null);
            form.resetFields();
            setOpen(true);
          }}
        >
          Thêm người dùng
        </Button>
        {can(me, 'users', 'create') && can(me, 'users', 'update') && <ImportExcelButton type="users" onDone={load} label="Import Excel" />}
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
                  {r.role === 'STUDENT' && can(me, 'users', 'update') && <Button size="small" onClick={async () => {
                    try {
                      const result = await getClassesApi();
                      if (result?.EC !== 0) return message.error(result?.EM);
                      setTransferClasses((result.data || []).filter(cls => String(cls.schoolId?._id || cls.schoolId) === String(r.schoolId?._id || r.schoolId) && String(cls._id) !== String(r.classId?._id || r.classId)));
                      transferForm.resetFields(); setTransferStudent(r);
                    } catch (error) { message.error(error.message); }
                  }}>Chuyển lớp</Button>}
                  <Button
                    size="small"
                    disabled={!can(me, 'users', 'update')}
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
                    title="Tạo mật khẩu tạm mới?"
                    description="Thu hồi phiên cũ và buộc đổi mật khẩu khi đăng nhập. 2FA được giữ nguyên."
                    onConfirm={() => onResetPassword(r._id)}
                  >
                    <Button size="small" disabled={!can(me, 'users', 'update')}>Reset MK</Button>
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
                    <Button size="small" danger disabled={!can(me, 'users', 'delete')}>
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
      <UserDialogs open={open} setOpen={setOpen} editing={editing} form={form} onSubmit={onSubmit} onResetPassword={onResetPassword} roleOptions={roleOptions} transferStudent={transferStudent} setTransferStudent={setTransferStudent} transferring={transferring} setTransferring={setTransferring} transferForm={transferForm} transferClasses={transferClasses} load={load} />
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
