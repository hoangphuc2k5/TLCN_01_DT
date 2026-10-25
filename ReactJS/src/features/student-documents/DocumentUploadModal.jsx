import { Form, Input, Modal, Select, message } from 'antd';
import { uploadStudentDocumentApi } from '../../services/api/files.api';

const DocumentUploadModal = ({ open, setOpen, saving, setSaving, form, file, setFile, load, students, handleFileChange, TYPE_LABELS }) => (
      <Modal
        open={open}
        title="Tải lên hồ sơ học sinh"
        confirmLoading={saving}
        onCancel={() => !saving && setOpen(false)}
        onOk={() => form.submit()}
        okText="Tải lên"
        cancelText="Hủy"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            if (!file) return message.error('Vui lòng chọn tệp cần tải lên');
            setSaving(true);
            try {
              const result = await uploadStudentDocumentApi(values, file);
              if (result?.EC !== 0) return message.error(result?.EM);
              message.success(result.EM || 'Tải lên thành công');
              setOpen(false);
              form.resetFields();
              setFile(null);
              load();
            } catch (error) {
              message.error(error.message || 'Tải lên thất bại');
            } finally {
              setSaving(false);
            }
          }}
        >
          <Form.Item name="studentId" label="Học sinh" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={students.map(s => ({ value: s._id, label: `${s.name}${s.code ? ` (${s.code})` : ''}` }))} />
          </Form.Item>
          <Form.Item name="documentType" label="Loại hồ sơ" initialValue="OTHER" rules={[{ required: true }]}>
            <Select options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="title" label="Tiêu đề hồ sơ" rules={[{ required: true }]}>
            <Input maxLength={180} />
          </Form.Item>
          <Form.Item label="Tệp đính kèm" extra="PDF, PNG/JPG, TXT, DOCX, XLSX hoặc PPTX – tối đa 10 MB">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt,.docx,.xlsx,.pptx"
              onChange={handleFileChange}
            />
          </Form.Item>
        </Form>
      </Modal>
);

export default DocumentUploadModal;
