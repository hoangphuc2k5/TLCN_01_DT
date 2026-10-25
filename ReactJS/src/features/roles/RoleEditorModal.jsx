import { Checkbox, Form, Input, InputNumber, Modal, Select, Table, Typography } from 'antd';
import { canManageLevel } from '../../constants/roles';

const RoleEditorModal = ({ open, setOpen, editing, form, onSubmit, me, myLevel, peerAdmin, minLevel, resources, actions, ACTION_LABELS, matrix, toggleAction }) => (
      <Modal
        open={open}
        title={editing ? `Sửa vai trò: ${editing.code}` : 'Tạo vai trò mới'}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        width={900}
        destroyOnHidden
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
            <InputNumber min={minLevel} disabled={!!editing?.isSystem} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select
              disabled={!!editing?.isSystem}
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
                    disabled={!!editing?.isSystem}
                    onChange={(e) => toggleAction(res.key, action, e.target.checked)}
                  />
                ),
              })),
            ]}
          />
        </Form>
      </Modal>
);

export default RoleEditorModal;
