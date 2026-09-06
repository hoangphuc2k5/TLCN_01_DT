import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Popconfirm, Select, Table, Radio, Switch, Typography, message } from 'antd';
import { useSelector } from 'react-redux';
import {
  createMaterialApi,
  deleteMaterialApi,
  getClassesApi,
  getMaterialsApi,
  getSubjectsApi,
  uploadMaterialApi,
  downloadFileAssetApi,
  getFileUsageApi,
} from '../../api';
import { can } from '../../util/permissions';

const MaterialsPage = () => {
  const { user } = useSelector((s) => s.auth);
  const canManage = can(user, 'materials', 'create');
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState('link');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [usage, setUsage] = useState(null);
  const [form] = Form.useForm();

  const load = async () => {
    const res = await getMaterialsApi();
    if (res?.EC === 0) setRows(res.data || []);
    if (canManage && user?.schoolId) {
      const storage = await getFileUsageApi();
      if (storage?.EC === 0) setUsage(storage.data);
    }
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
      {usage && <Typography.Paragraph type="secondary">Dung lượng trường: {(usage.usedBytes / 1024 ** 2).toFixed(2)} / {(usage.quotaBytes / 1024 ** 2).toFixed(2)} MB · Tối đa {(usage.maxFileBytes / 1024 ** 2).toFixed(0)} MB/file</Typography.Paragraph>}
      <Table
        rowKey="_id"
        dataSource={rows}
        columns={[
          { title: 'Tiêu đề', dataIndex: 'title' },
          { title: 'Chủ đề', dataIndex: 'topic' },
          { title: 'Môn', render: (_, r) => r.subjectId?.name || '—' },
          { title: 'Lớp', render: (_, r) => r.classId?.name || '—' },
          {
            title: 'Tài liệu',
            dataIndex: 'fileUrl',
            render: (v, r) =>
              r.fileAssetId ? <Button type="link" onClick={() => downloadFileAssetApi(r.fileAssetId).catch(e => message.error(e.message))}>Tải file</Button> : v ? (
                <a href={v} target="_blank" rel="noreferrer">
                  Mở
                </a>
              ) : (
                '—'
              ),
          },
          { title: 'Người đăng', render: (_, r) => r.uploadedBy?.name },
          can(user, 'materials', 'delete')
            ? {
                title: 'Xóa',
                render: (_, r) => ((r.uploadedBy?._id || r.uploadedBy) === user?._id || ['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(user?.role)) && (
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
      <Modal open={open} title="Thêm học liệu" confirmLoading={saving} cancelButtonProps={{ disabled: saving }} closable={!saving} maskClosable={!saving} onCancel={() => setOpen(false)} onOk={() => form.submit()}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ isShared: true }}
          onFinish={async (v) => {
            if (saving) return;
            if (source === 'file' && !file) return message.error('Cần chọn file');
            if (source === 'file' && usage && file.size > usage.maxFileBytes) return message.error('File vượt giới hạn tải lên');
            setSaving(true);
            try {
              const res = source === 'file' ? await uploadMaterialApi(v, file) : await createMaterialApi(v);
              if (res?.EC === 0) {
                message.success(res.EM);
                setOpen(false);
                form.resetFields();
                setFile(null);
                setSource('link');
                load();
              } else message.error(res?.EM);
            } catch (error) { message.error(error.message || 'Không lưu được học liệu'); }
            finally { setSaving(false); }
          }}
        >
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="topic" label="Chủ đề">
            <Input />
          </Form.Item>
          <Form.Item label="Nguồn tài liệu">
            <Radio.Group value={source} onChange={e => setSource(e.target.value)} options={[{ label: 'Liên kết', value: 'link' }, { label: 'Tải file lên', value: 'file' }]} />
          </Form.Item>
          {source === 'file' ? <Form.Item label="Chọn file" htmlFor="material-file" extra="PDF, PNG/JPG, TXT, DOCX, XLSX hoặc PPTX">
            <input key={open ? 'open' : 'closed'} id="material-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.docx,.xlsx,.pptx" onChange={e => setFile(e.target.files?.[0] || null)} />
          </Form.Item> : <Form.Item name="fileUrl" label="URL tài liệu">
            <Input placeholder="https://..." />
          </Form.Item>}
          <Form.Item name="isShared" label="Chia sẻ học liệu" valuePropName="checked"><Switch /></Form.Item>
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
