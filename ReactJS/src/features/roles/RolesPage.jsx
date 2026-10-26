import { useEffect, useMemo, useState } from 'react';
import {
  Button,  Form,  Popconfirm,  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { useSelector } from 'react-redux';
import {
  createRoleApi,
  deleteRoleApi,
  getPermissionCatalogApi,
  getRolesApi,
  updateRoleApi,
} from '../../services/api.service';
import { canManageLevel, PEER_MANAGE_ROLES, ROLES } from '../../constants/roles';
import { can, ownsRole } from '../../utils/permissions';
import RoleEditorModal from './RoleEditorModal';

const ACTION_LABELS = {
  view: 'Xem',
  create: 'Tạo',
  update: 'Sửa',
  delete: 'Xóa',
  execute: 'Thực thi',
};

const DEFAULT_LEVELS = {
  [ROLES.SUPER_ADMIN]: 0,
  [ROLES.CLUSTER_ADMIN]: 10,
  [ROLES.SCHOOL_ADMIN]: 20,
  [ROLES.ACADEMIC_AFFAIRS]: 30,
  [ROLES.HOMEROOM_TEACHER]: 40,
  [ROLES.SUBJECT_TEACHER]: 40,
  [ROLES.ACCOUNTANT]: 50,
  [ROLES.LIBRARIAN]: 50,
  [ROLES.STUDENT]: 60,
  [ROLES.PARENT]: 60,
};

const RolesPage = () => {
  const me = useSelector((s) => s.auth.user);
  const myLevel =
    me?.roleLevel ?? DEFAULT_LEVELS[me?.role] ?? 999;
  const peerAdmin = PEER_MANAGE_ROLES.includes(me?.role);
  const minLevel = peerAdmin ? myLevel : myLevel + 1;
  const [rows, setRows] = useState([]);
  const [catalog, setCatalog] = useState({ resources: [], actions: [] });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [matrix, setMatrix] = useState({});
  const [form] = Form.useForm();

  const load = async () => {
    const [rolesRes, catRes] = await Promise.all([getRolesApi(), getPermissionCatalogApi()]);
    if (rolesRes?.EC === 0) {
      const list = (rolesRes.data || []).filter((r) =>
        canManageLevel(me?.role, myLevel, r.level ?? 999)
      );
      setRows(list);
    } else message.error(rolesRes?.EM);
    if (catRes?.EC === 0) setCatalog(catRes.data || { resources: [], actions: [] });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.role, myLevel]);

  const canManage = (role) => canManageLevel(me?.role, myLevel, role?.level ?? 999) && ownsRole(me, role);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ level: minLevel, status: 'ACTIVE' });
    setMatrix({});
    setOpen(true);
  };

  const openEdit = (role) => {
    if (!canManage(role)) {
      message.error('Chỉ được sửa vai trò cùng cấp hoặc thấp hơn');
      return;
    }
    setEditing(role);
    form.setFieldsValue({
      code: role.code,
      name: role.name,
      description: role.description,
      level: role.level,
      status: role.status,
    });
    const next = {};
    (role.permissions || []).forEach((p) => {
      next[p.resource] = [...(p.actions || [])];
    });
    setMatrix(next);
    setOpen(true);
  };

  const toggleAction = (resource, action, checked) => {
    setMatrix((prev) => {
      const cur = new Set(prev[resource] || []);
      if (checked) cur.add(action);
      else cur.delete(action);
      return { ...prev, [resource]: [...cur] };
    });
  };

  const buildPermissions = () =>
    Object.entries(matrix)
      .filter(([, actions]) => actions?.length)
      .map(([resource, actions]) => ({ resource, actions }));

  const onSubmit = async (values) => {
    const payload = {
      name: values.name,
      description: values.description || '',
      level: values.level,
      status: values.status,
      permissions: buildPermissions(),
    };
    if (!editing) payload.code = values.code;

    const res = editing
      ? await updateRoleApi(editing._id, payload)
      : await createRoleApi(payload);
    if (res?.EC === 0) {
      message.success(res.EM);
      setOpen(false);
      load();
    } else message.error(res?.EM);
  };

  const actions = catalog.actions?.length ? catalog.actions : Object.keys(ACTION_LABELS);
  const resources = catalog.resources || [];

  const columns = useMemo(
    () => [
      { title: 'Mã', dataIndex: 'code', width: 160 },
      { title: 'Tên', dataIndex: 'name' },
      { title: 'Level', dataIndex: 'level', width: 80 },
      {
        title: 'Hệ thống',
        dataIndex: 'isSystem',
        width: 100,
        render: (v) => (v ? <Tag color="blue">Có</Tag> : <Tag>Tùy chỉnh</Tag>),
      },
      { title: 'Trạng thái', dataIndex: 'status', width: 110 },
      {
        title: 'Thao tác',
        width: 180,
        render: (_, r) => (
          <Space>
            {canManage(r) && can(me, 'roles', 'update') && !r.isSystem && (
              <Button size="small" onClick={() => openEdit(r)}>
                Sửa
              </Button>
            )}
            {canManage(r) && can(me, 'roles', 'delete') && !r.isSystem && (
              <Popconfirm
                title="Xóa vai trò?"
                onConfirm={async () => {
                  const res = await deleteRoleApi(r._id);
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
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [myLevel, rows, me]
  );

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={openCreate} disabled={!can(me, 'roles', 'create')}>
          Tạo vai trò
        </Button>
        <Typography.Text type="secondary">
          {peerAdmin
            ? `Quản lý vai trò cùng cấp hoặc thấp hơn (level ≥ ${myLevel})`
            : `Chỉ quản lý vai trò cấp thấp hơn (level > ${myLevel})`}
        </Typography.Text>
      </Space>
      <Table rowKey={(r) => r._id || r.code} dataSource={rows} columns={columns} pagination={{ pageSize: 20 }} />

      <RoleEditorModal open={open} setOpen={setOpen} editing={editing} form={form} onSubmit={onSubmit} me={me} myLevel={myLevel} peerAdmin={peerAdmin} minLevel={minLevel} resources={resources} actions={actions} ACTION_LABELS={ACTION_LABELS} matrix={matrix} toggleAction={toggleAction} />
    </div>
  );
};

export default RolesPage;
