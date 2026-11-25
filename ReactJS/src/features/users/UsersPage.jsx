import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Form,
  Input,
  Modal,  Space,
  Table,
  Tabs,
  message,
  Popconfirm,
  Select,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
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
import SchoolTransfers from './SchoolTransfers';
import { enumLabel } from '../../utils/enum-labels';

const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'];

const normalizeSearchValue = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[đĐ]/g, 'd')
  .toLocaleLowerCase('vi-VN')
  .trim();

const UsersPage = () => {
  const me = useSelector((s) => s.auth.user);
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState();
  const [statusFilter, setStatusFilter] = useState();

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

  const userRoleOptions = useMemo(() => [...new Set(rows.map((row) => row.role).filter(Boolean))]
    .sort((a, b) => (roleLabelMap[a] || a).localeCompare(roleLabelMap[b] || b, 'vi'))
    .map((value) => ({
      value,
      label: rows.find((row) => row.role === value)?.roleLabel || roleLabelMap[value] || value,
    })), [rows, roleLabelMap]);

  const filteredRows = useMemo(() => {
    const query = normalizeSearchValue(searchText);
    return rows.filter((row) => {
      if (roleFilter && row.role !== roleFilter) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      if (!query) return true;
      const roleLabel = row.roleLabel || roleLabelMap[row.role] || row.role;
      return [row.code, row.name, row.email, row.schoolId?.name, roleLabel, enumLabel(row.status)]
        .some((value) => normalizeSearchValue(value).includes(query));
    });
  }, [rows, roleFilter, statusFilter, searchText, roleLabelMap]);

  const hasUserFilters = Boolean(searchText.trim() || roleFilter || statusFilter);

  const usersTab = (
    <div>
      <div className="users-toolbar">
        <Space className="users-toolbar-actions">
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
        <div className="users-filters" role="search" aria-label="Tìm và lọc người dùng">
          <Input
            allowClear
            aria-label="Tìm người dùng"
            placeholder="Tìm mã, họ tên, email, trường..."
            prefix={<SearchOutlined aria-hidden="true" />}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <Select
            allowClear
            showSearch
            aria-label="Lọc theo vai trò"
            optionFilterProp="label"
            placeholder="Tất cả vai trò"
            value={roleFilter}
            onChange={setRoleFilter}
            options={userRoleOptions}
          />
          <Select
            allowClear
            aria-label="Lọc theo trạng thái"
            placeholder="Tất cả trạng thái"
            value={statusFilter}
            onChange={setStatusFilter}
            options={USER_STATUSES.map((value) => ({ value, label: `${value} · ${enumLabel(value)}` }))}
          />
          {hasUserFilters && <Button onClick={() => {
            setSearchText('');
            setRoleFilter(undefined);
            setStatusFilter(undefined);
          }}>Xóa lọc</Button>}
        </div>
      </div>
      <Table
        rowKey="_id"
        className="users-table"
        dataSource={filteredRows}
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
        scroll={{ x: 1100, y: 'min(62vh, 640px)' }}
      />
      <UserDialogs open={open} setOpen={setOpen} editing={editing} form={form} onSubmit={onSubmit} onResetPassword={onResetPassword} roleOptions={roleOptions} transferStudent={transferStudent} setTransferStudent={setTransferStudent} transferring={transferring} setTransferring={setTransferring} transferForm={transferForm} transferClasses={transferClasses} load={load} />
    </div>
  );

  return (
    <Tabs
      activeKey={searchParams.get('tab') === 'school-transfers' && ['SUPER_ADMIN', 'CLUSTER_ADMIN', 'SCHOOL_ADMIN'].includes(me?.role)
        ? 'school-transfers' : searchParams.get('tab') === 'roles' && canManageRoles ? 'roles' : 'users'}
      onChange={key => setSearchParams(current => {
        const next = new URLSearchParams(current);
        next.set('tab', key);
        if (key !== 'school-transfers') next.delete('transferId');
        return next;
      })}
      items={[
        { key: 'users', label: 'Người dùng', children: usersTab },
        ...(['SUPER_ADMIN', 'CLUSTER_ADMIN', 'SCHOOL_ADMIN'].includes(me?.role) ? [{ key: 'school-transfers', label: 'Chuyển trường', children: <SchoolTransfers /> }] : []),
        ...(canManageRoles ? [{ key: 'roles', label: 'Vai trò', children: <RolesPage /> }] : []),
      ]}
    />
  );
};

export default UsersPage;
