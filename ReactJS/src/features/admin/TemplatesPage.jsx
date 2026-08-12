import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import { useSelector } from 'react-redux';
import {
  applyTemplateApi,
  createTemplateApi,
  getSchoolsApi,
  getTemplatesApi,
} from '../../api';
import { ROLES } from '../../constants/roles';

const TemplatesPage = () => {
  const { user } = useSelector((s) => s.auth);
  const canCreate = [ROLES.SUPER_ADMIN, ROLES.CLUSTER_ADMIN].includes(user?.role);
  const canApply = [ROLES.SUPER_ADMIN, ROLES.CLUSTER_ADMIN, ROLES.SCHOOL_ADMIN].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [schools, setSchools] = useState([]);
  const [open, setOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [selectedTpl, setSelectedTpl] = useState(null);
  const [form] = Form.useForm();
  const [applyForm] = Form.useForm();

  const load = async () => {
    const res = await getTemplatesApi();
    if (res?.EC === 0) setRows(res.data || []);
  };

  useEffect(() => {
    (async () => {
      if (canApply) {
        const s = await getSchoolsApi();
        if (s?.EC === 0) setSchools(s.data || []);
      }
      load();
    })();
  }, []);

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        {canCreate && (
          <Button type="primary" onClick={() => setOpen(true)}>
            Tạo mẫu
          </Button>
        )}
      </Space>
      <Table
        rowKey="_id"
        dataSource={rows}
        columns={[
          { title: 'Tên mẫu', dataIndex: 'name' },
          { title: 'Loại', dataIndex: 'type' },
          {
            title: 'Phạm vi',
            dataIndex: 'scope',
            render: (v) => <Tag>{v}</Tag>,
          },
          { title: 'Phiên bản', dataIndex: 'version' },
          { title: 'Người tạo', render: (_, r) => r.createdBy?.name },
          {
            title: 'TT',
            dataIndex: 'isActive',
            render: (v) => (v ? <Tag color="green">Active</Tag> : <Tag>Off</Tag>),
          },
          canApply
            ? {
                title: 'Áp dụng',
                render: (_, r) => (
                  <Button
                    size="small"
                    onClick={() => {
                      setSelectedTpl(r);
                      setApplyOpen(true);
                    }}
                  >
                    Áp dụng cho trường
                  </Button>
                ),
              }
            : {},
        ].filter((c) => c.title)}
        expandable={{
          expandedRowRender: (r) => <pre style={{ whiteSpace: 'pre-wrap' }}>{r.content}</pre>,
        }}
      />

      <Modal open={open} title="Tạo mẫu dùng chung" onCancel={() => setOpen(false)} onOk={() => form.submit()}>
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            const res = await createTemplateApi(v);
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpen(false);
              form.resetFields();
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="name" label="Tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="Loại" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'TRANSCRIPT', label: 'Học bạ' },
                { value: 'GRADE_SHEET', label: 'Bảng điểm' },
                { value: 'CURRICULUM', label: 'Khung chương trình' },
              ]}
            />
          </Form.Item>
          <Form.Item name="version" label="Phiên bản" initialValue="1.0">
            <Input />
          </Form.Item>
          <Form.Item name="content" label="Nội dung mẫu">
            <Input.TextArea rows={5} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={applyOpen}
        title={`Áp dụng: ${selectedTpl?.name || ''}`}
        onCancel={() => setApplyOpen(false)}
        onOk={() => applyForm.submit()}
      >
        <Form
          form={applyForm}
          layout="vertical"
          onFinish={async (v) => {
            const res = await applyTemplateApi(v.schoolId, selectedTpl._id);
            if (res?.EC === 0) {
              message.success(res.EM);
              setApplyOpen(false);
              applyForm.resetFields();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="schoolId" label="Trường" rules={[{ required: true }]}>
            <Select options={schools.map((s) => ({ value: s._id, label: s.name }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TemplatesPage;
