import { Alert, Button, Card, Input, Select, Space, Tag, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

const THPT_SECTION_TYPES = {
  MCQ: 'Một đáp án',
  TRUE_FALSE_4: 'Đúng/Sai 4 ý',
  SHORT_ANSWER: 'Trả lời ngắn',
};

const CUSTOM_TYPE_OPTIONS = [
  { value: 'MIXED', label: 'Cho phép nhiều dạng' },
  { value: 'MCQ', label: 'Trắc nghiệm một đáp án' },
  { value: 'MCQ_MULTI', label: 'Trắc nghiệm nhiều đáp án' },
  { value: 'TRUE_FALSE_4', label: 'Đúng/Sai 4 ý' },
  { value: 'SHORT_ANSWER', label: 'Trả lời ngắn' },
  { value: 'ESSAY', label: 'Tự luận' },
];

const formatPoints = value => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);

const ExamSectionsEditor = ({ template, sections, setSections, questions, totalPoints }) => {
  const removeSection = key => setSections(current => current
    .filter(section => section.key !== key)
    .map((section, order) => ({ ...section, order })));

  if (template === 'THPT_2025') {
    return (
      <>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Mẫu gồm trắc nghiệm, Đúng/Sai 4 ý và trả lời ngắn. Số câu và điểm có thể khác theo môn; tổng hiện tại ${formatPoints(totalPoints)}/10. Đề chỉ mở được khi tổng điểm bằng 10.`}
        />
        <Card size="small" title="Các phần THPT" style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {sections.map(section => (
              <Space key={section.key} wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                <Typography.Text>{section.title}</Typography.Text>
                <Tag color="blue">{THPT_SECTION_TYPES[section.questionType] || section.questionType}</Tag>
                <Button
                  aria-label={`Bỏ phần ${section.title}`}
                  danger
                  icon={<DeleteOutlined />}
                  disabled={sections.length <= 1 || questions.some(question => question.sectionKey === section.key)}
                  onClick={() => removeSection(section.key)}
                />
              </Space>
            ))}
          </Space>
        </Card>
      </>
    );
  }

  return (
    <Card size="small" title="Các phần trong đề" style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        {sections.map((section, index) => (
          <Space key={section.key} align="start" wrap style={{ width: '100%' }}>
            <Input
              aria-label={`Tên phần ${index + 1}`}
              value={section.title}
              maxLength={120}
              onChange={event => setSections(current => current.map(item => item.key === section.key ? { ...item, title: event.target.value } : item))}
              style={{ width: 220 }}
            />
            <Input
              aria-label={`Hướng dẫn phần ${index + 1}`}
              value={section.instructions}
              maxLength={2000}
              placeholder="Hướng dẫn phần (không bắt buộc)"
              onChange={event => setSections(current => current.map(item => item.key === section.key ? { ...item, instructions: event.target.value } : item))}
              style={{ width: 250 }}
            />
            <Select
              aria-label={`Dạng câu hỏi phần ${index + 1}`}
              value={section.questionType || 'MIXED'}
              onChange={value => setSections(current => current.map(item => item.key === section.key ? { ...item, questionType: value === 'MIXED' ? null : value } : item))}
              options={CUSTOM_TYPE_OPTIONS}
              style={{ width: 205 }}
            />
            <Button
              aria-label={`Xóa phần ${index + 1}`}
              danger
              icon={<DeleteOutlined />}
              disabled={sections.length <= 1 || questions.some(question => question.sectionKey === section.key)}
              onClick={() => removeSection(section.key)}
            />
          </Space>
        ))}
        <Button
          icon={<PlusOutlined />}
          onClick={() => setSections(current => [...current, {
            key: `section_${Date.now()}`,
            title: `Phần ${current.length + 1}`,
            instructions: '',
            order: current.length,
            questionType: null,
          }])}
        >
          Thêm phần
        </Button>
      </Space>
    </Card>
  );
};

export default ExamSectionsEditor;
