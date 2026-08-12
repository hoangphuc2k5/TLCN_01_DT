import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
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
} from '../../api';
import { canManageLevel, PEER_MANAGE_ROLES, ROLES } from '../../constants/roles';

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

  const canManage = (role) => canManageLevel(me?.role, myLevel, role?.level ?? 999);

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
            {canManage(r) && (
              <Button size="small" onClick={() => openEdit(r)}>
                Sửa
              </Button>
            )}
            {canManage(r) && !r.isSystem && (
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
    [myLevel, rows]
  );

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={openCreate}>
          Tạo vai trò
        </Button>
        <Typography.Text type="secondary">
          {peerAdmin
            ? `Quản lý vai trò cùng cấp hoặc thấp hơn (level ≥ ${myLevel})`
            : `Chỉ quản lý vai trò cấp thấp hơn (level > ${myLevel})`}
        </Typography.Text>
      </Space>
      <Table rowKey={(r) => r._id || r.code} dataSource={rows} columns={columns} pagination={{ pageSize: 20 }} />

      <Modal
        open={open}
        title={editing ? `Sửa vai trò: ${editing.code}` : 'Tạo vai trò mới'}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        width={900}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item
            name="code"
            label="Mã (code)"
            rules={[{ required: !editing, message: 'Nhập mã' }]}
            extra={editing?.isSystem ? 'Vai trò hệ thống không đổi mã' : undefined}
          >
            <Input disabled={!!editing} placeholder="VD: DEPUTY_PRINCIPAL" style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          <Form.Item name="name" label="Tên hiển thị" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="level"
            label="Cấp bậc (level)"
            rules={[
              { required: true },
              {
                validator: (_, value) => {
                  if (value == null || Number.isNaN(Number(value))) {
                    return Promise.reject(new Error('Nhập level'));
                  }
                  if (!canManageLevel(me?.role, myLevel, Number(value))) {
                    return Promise.reject(
                      new Error(
                        peerAdmin
                          ? `Chỉ được chọn level ≥ ${myLevel} (ngang hoặc thấp hơn)`
                          : `Chỉ được chọn level > ${myLevel} (thấp hơn)`
                      )
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
            extra={
              peerAdmin
                ? `Chỉ ngang cấp hoặc thấp hơn (level ≥ ${myLevel}; số càng lớn càng thấp quyền)`
                : `Chỉ thấp hơn (level > ${myLevel}; số càng lớn càng thấp quyền)`
            }
          >
            <InputNumber min={minLevel} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select
              options={[
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'INACTIVE', label: 'INACTIVE' },
              ]}
            />
          </Form.Item>

          <Typography.Title level={5}>Ma trận quyền</Typography.Title>
          <Table
            size="small"
            pagination={false}
            rowKey="key"
            scroll={{ x: 700, y: 360 }}
            dataSource={resources}
            columns={[
              { title: 'Chức năng', dataIndex: 'label', width: 200, fixed: 'left' },
              ...actions.map((action) => ({
                title: ACTION_LABELS[action] || action,
                width: 90,
                align: 'center',
                render: (_, res) => (
                  <Checkbox
                    checked={(matrix[res.key] || []).includes(action)}
                    onChange={(e) => toggleAction(res.key, action, e.target.checked)}
                  />
                ),
              })),
            ]}
          />
        </Form>
      </Modal>
    </div>
  );
};

export default RolesPage;
