import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Popconfirm, Select, Table, message } from 'antd';
import { useSelector } from 'react-redux';
import {
  createMaterialApi,
  deleteMaterialApi,
  getClassesApi,
  getMaterialsApi,
  getSubjectsApi,
} from '../../api';
import { ROLES } from '../../constants/roles';

const MaterialsPage = () => {
  const { user } = useSelector((s) => s.auth);
  const canManage = [
    ROLES.SUBJECT_TEACHER,
    ROLES.HOMEROOM_TEACHER,
    ROLES.SCHOOL_ADMIN,
    ROLES.ACADEMIC_AFFAIRS,
  ].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    const res = await getMaterialsApi();
    if (res?.EC === 0) setRows(res.data || []);
  };

  useEffect(() => {
    (async () => {
      if (canManage) {
        const [c, s] = await Promise.all([getClassesApi(), getSubjectsApi()]);
        if (c?.EC === 0) setClasses(c.data || []);
        if (s?.EC === 0) setSubjects(s.data || []);
      }
      load();
    })();
  }, []);

  return (
    <div>
      {canManage && (
        <Button type="primary" style={{ marginBottom: 16 }} onClick={() => setOpen(true)}>
          Thêm học liệu
        </Button>
      )}
      <Table
        rowKey="_id"
        dataSource={rows}
        columns={[
          { title: 'Tiêu đề', dataIndex: 'title' },
          { title: 'Chủ đề', dataIndex: 'topic' },
          { title: 'Môn', render: (_, r) => r.subjectId?.name || '—' },
          { title: 'Lớp', render: (_, r) => r.classId?.name || '—' },
          {
            title: 'Link',
            dataIndex: 'fileUrl',
            render: (v) =>
              v ? (
                <a href={v} target="_blank" rel="noreferrer">
                  Mở
                </a>
              ) : (
                '—'
              ),
          },
          { title: 'Người đăng', render: (_, r) => r.uploadedBy?.name },
          canManage
            ? {
                title: 'Xóa',
                render: (_, r) => (
                  <Popconfirm
                    title="Xóa học liệu?"
                    onConfirm={async () => {
                      const res = await deleteMaterialApi(r._id);
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
                ),
              }
            : {},
        ].filter((c) => c.title)}
      />
      <Modal open={open} title="Thêm học liệu" onCancel={() => setOpen(false)} onOk={() => form.submit()}>
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            const res = await createMaterialApi(v);
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
          <Form.Item name="topic" label="Chủ đề">
            <Input />
          </Form.Item>
          <Form.Item name="fileUrl" label="URL tài liệu">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="subjectId" label="Môn">
            <Select allowClear options={subjects.map((s) => ({ value: s._id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="classId" label="Lớp">
            <Select allowClear options={classes.map((c) => ({ value: c._id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MaterialsPage;
