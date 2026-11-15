import { Button, Divider, Form, Input, InputNumber, Modal, Select, Space, message } from 'antd';
import ExamQuestionInputTabs from './ExamQuestionInputTabs';
import ExamQuestionList from './ExamQuestionList';
import ExamSectionsEditor from './ExamSectionsEditor';

const createCustomSections = () => [{ key: `section_${Date.now()}`, title: 'Phần 1', instructions: '', order: 0, questionType: null }];
const createThptSections = () => [
  { key: 'thpt_part_1', title: 'Phần I - Trắc nghiệm nhiều lựa chọn', instructions: '', order: 0, questionType: 'MCQ' },
  { key: 'thpt_part_2', title: 'Phần II - Trắc nghiệm Đúng/Sai', instructions: '', order: 1, questionType: 'TRUE_FALSE_4' },
  { key: 'thpt_part_3', title: 'Phần III - Trả lời ngắn', instructions: '', order: 2, questionType: 'SHORT_ANSWER' },
];

const ExamBuilderModal = ({ open, setOpen, form, draft, classes, subjects, onSubmit, saving }) => {
  const handleFinish = values => {
    if (!draft.questions.length) {
      return message.error('Vui lòng thêm ít nhất 1 câu hỏi cho đề thi (từ file Excel, dán văn bản hoặc thêm thủ công)');
    }
    return onSubmit(values);
  };

  return (
    <Modal
      open={open}
      title="Tạo đề thi mới"
      onCancel={() => setOpen(false)}
      onOk={() => form.submit()}
      confirmLoading={saving}
      okText="Tạo đề thi"
      cancelText="Hủy"
      width={840}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Space className="exam-builder__metadata" size="middle" wrap>
          <Form.Item
            name="title"
            label="Tiêu đề đề thi"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề đề thi' }]}
          >
            <Input placeholder="VD: Kiểm tra 1 tiết - Môn Toán HK1" />
          </Form.Item>
          <Form.Item name="classId" label="Lớp học">
            <Select allowClear placeholder="Chọn lớp" options={classes.map(item => ({ value: item._id, label: item.name }))} />
          </Form.Item>
          <Form.Item name="subjectId" label="Môn học">
            <Select allowClear placeholder="Chọn môn" options={subjects.map(item => ({ value: item._id, label: item.name }))} />
          </Form.Item>
          <Form.Item
            name="durationMinutes"
            label="Thời gian (phút)"
            initialValue={45}
            rules={[{ required: true }]}
          >
            <InputNumber min={5} max={180} style={{ width: '100%' }} />
          </Form.Item>
        </Space>

        <Form.Item label="Cấu trúc đề" className="exam-builder__template">
          <Select
            value={draft.template}
            onChange={value => {
              if (draft.questions.length) return message.warning('Chọn cấu trúc đề trước khi thêm câu hỏi');
              draft.setTemplate(value);
              draft.setSections(value === 'THPT_2025' ? createThptSections() : createCustomSections());
              draft.setManualType('MCQ');
              draft.manualForm.setFieldsValue({
                type: 'MCQ',
                sectionKey: value === 'THPT_2025' ? 'thpt_part_1' : undefined,
                points: 0.25,
              });
            }}
            options={[
              { value: 'CUSTOM', label: 'Đề tự thiết kế' },
              { value: 'THPT_2025', label: 'Mẫu cấu trúc THPT' },
            ]}
          />
        </Form.Item>

        <ExamSectionsEditor
          template={draft.template}
          sections={draft.sections}
          setSections={draft.setSections}
          questions={draft.questions}
          totalPoints={draft.totalPoints}
        />

        <Divider>Phương thức thêm câu hỏi vào đề</Divider>
        <ExamQuestionInputTabs draft={draft} />
        <ExamQuestionList draft={draft} />
      </Form>
    </Modal>
  );
};

export default ExamBuilderModal;
