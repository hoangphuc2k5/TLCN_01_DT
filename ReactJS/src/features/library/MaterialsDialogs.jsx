import { Form, Input, Modal, Radio, Select, Space, Switch, Table, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { createMaterialApi } from '../../services/api/learning.api';
import { uploadMaterialApi } from '../../services/api/files.api';
import FilePreviewModal from '../../components/FilePreviewModal';

const MaterialsDialogs = ({ downloads, setDownloads, open, setOpen, saving, setSaving, form, source, setSource, file, setFile, usage, load, subjects, classes, preview, closePreview }) => (
  <>
      <Modal
        open={downloads.open}
        width={900}
        footer={null}
        title={`Lượt tải — ${downloads.data?.material?.title || ''}`}
        onCancel={() => setDownloads({ open: false, loading: false, data: null })}
      >
        <Space size="large" style={{ marginBottom: 16 }}>
          <Typography.Text>Tổng lượt: <strong>{downloads.data?.totalDownloads || 0}</strong></Typography.Text>
          <Typography.Text>Người tải: <strong>{downloads.data?.uniqueDownloaders || 0}</strong></Typography.Text>
        </Space>
        <Table
          loading={downloads.loading}
          rowKey="_id"
          size="small"
          pagination={{ pageSize: 10 }}
          dataSource={downloads.data?.downloads || []}
          columns={[
            { title: 'Người tải', render: (_, row) => row.userId?.name || 'Tài khoản đã xóa' },
            { title: 'Mã', render: (_, row) => row.userId?.code || '—' },
            { title: 'Vai trò', render: (_, row) => row.userId?.role || '—' },
            { title: 'Thời điểm', dataIndex: 'completedAt', render: value => value ? dayjs(value).format('DD/MM/YYYY HH:mm:ss') : '—' },
            { title: 'Dung lượng', dataIndex: 'sizeBytes', render: value => `${(Number(value || 0) / 1024).toFixed(1)} KB` },
          ]}
        />
      </Modal>
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
      <FilePreviewModal {...preview} onClose={closePreview} />
  </>
);

export default MaterialsDialogs;
