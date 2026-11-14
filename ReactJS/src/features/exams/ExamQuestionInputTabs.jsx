import { Button, Card, Checkbox, Form, Input, InputNumber, Select, Space, Tabs, Typography, Upload } from 'antd';
import { DownloadOutlined, FileExcelOutlined, FileTextOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';

const TYPE_OPTIONS = [
  { value: 'MCQ', label: 'Trắc nghiệm một đáp án' },
  { value: 'MCQ_MULTI', label: 'Trắc nghiệm nhiều đáp án' },
  { value: 'TRUE_FALSE_4', label: 'Đúng/Sai 4 ý (THPT)' },
  { value: 'SHORT_ANSWER', label: 'Trả lời ngắn' },
  { value: 'ESSAY', label: 'Tự luận' },
];

const defaultPoints = type => type === 'TRUE_FALSE_4' ? 1 : type === 'SHORT_ANSWER' || type === 'MCQ' ? 0.25 : type === 'ESSAY' ? 2 : 1;

const ExamQuestionInputTabs = ({
  downloadTemplate, importLoading, handleUploadExcel, pastedText, setPastedText, handleParseText,
  manualForm, handleAddManual, manualType, setManualType, sections,
}) => {
  const activeSectionKey = Form.useWatch('sectionKey', manualForm);
  const activeSection = sections.find(section => section.key === activeSectionKey);
  const forcedType = activeSection?.questionType;
  const selectedType = forcedType || manualType;

  const handleSectionChange = key => {
    const section = sections.find(item => item.key === key);
    manualForm.setFieldValue('sectionKey', key);
    if (section?.questionType) {
      setManualType(section.questionType);
      manualForm.setFieldsValue({ type: section.questionType, points: defaultPoints(section.questionType) });
    }
  };

  return (
    <Tabs
      defaultActiveKey="manual"
      items={[
        {
          key: 'excel',
          label: <span><FileExcelOutlined /> Nhập từ file Excel</span>,
          children: (
            <Card size="small" style={{ background: '#fafafa', marginBottom: 16 }}>
              <Typography.Paragraph type="secondary">File nhập hỗ trợ trắc nghiệm một đáp án và tự luận. Các dạng câu hỏi mới có thể thêm thủ công.</Typography.Paragraph>
              <Space wrap>
                <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>Tải file mẫu Excel</Button>
                <Upload accept=".xlsx,.xls" showUploadList={false} beforeUpload={handleUploadExcel}>
                  <Button type="primary" loading={importLoading} icon={<UploadOutlined />}>Chọn file Excel</Button>
                </Upload>
              </Space>
            </Card>
          ),
        },
        {
          key: 'text',
          label: <span><FileTextOutlined /> Dán văn bản</span>,
          children: (
            <Card size="small" style={{ background: '#fafafa', marginBottom: 16 }}>
              <Typography.Paragraph type="secondary">Định dạng dán hiện hỗ trợ trắc nghiệm một đáp án và tự luận.</Typography.Paragraph>
              <Input.TextArea
                rows={7}
                value={pastedText}
                onChange={event => setPastedText(event.target.value)}
                placeholder={`Câu 1: Thủ đô của Việt Nam là gì?\nA. Hà Nội\nB. Đà Nẵng\nC. TP.HCM\nD. Cần Thơ\nĐáp án: A\n\nCâu 2: Giải thích câu trả lời của em.`}
              />
              <div style={{ marginTop: 10, textAlign: 'right' }}>
                <Button type="primary" icon={<FileTextOutlined />} onClick={handleParseText}>Bóc tách câu hỏi</Button>
              </div>
            </Card>
          ),
        },
        {
          key: 'manual',
          label: <span><PlusOutlined /> Thêm câu thủ công</span>,
          children: (
            <Card size="small" style={{ background: '#fafafa', marginBottom: 16 }}>
              <Form
                form={manualForm}
                layout="vertical"
                initialValues={{ type: 'MCQ', points: 0.25, correctKey: 'A', sectionKey: sections[0]?.key }}
                onFinish={handleAddManual}
              >
                <Space wrap align="start" style={{ width: '100%' }}>
                  <Form.Item name="sectionKey" label="Phần thi" rules={[{ required: true }]} style={{ minWidth: 190 }}>
                    <Select options={sections.map(section => ({ value: section.key, label: section.title }))} onChange={handleSectionChange} />
                  </Form.Item>
                  <Form.Item name="type" label="Dạng câu hỏi" style={{ minWidth: 230 }}>
                    <Select
                      disabled={Boolean(forcedType)}
                      value={selectedType}
                      options={TYPE_OPTIONS}
                      onChange={value => {
                        setManualType(value);
                        manualForm.setFieldValue('points', defaultPoints(value));
                      }}
                    />
                  </Form.Item>
                  <Form.Item name="points" label="Điểm tối đa" rules={[{ required: true }]} style={{ minWidth: 130 }}>
                    <InputNumber min={0.1} max={10} step={0.05} style={{ width: '100%' }} />
                  </Form.Item>
                </Space>

                <Form.Item name="prompt" label="Nội dung câu hỏi / câu dẫn" rules={[{ required: true, whitespace: true }]}>
                  <Input.TextArea rows={2} maxLength={5000} showCount placeholder="Nhập nội dung câu hỏi..." />
                </Form.Item>

                {(selectedType === 'MCQ' || selectedType === 'MCQ_MULTI') && (
                  <>
                    <Space wrap style={{ width: '100%' }}>
                      {['A', 'B', 'C', 'D'].map(key => (
                        <Form.Item key={key} name={`opt${key}`} label={`Phương án ${key}`} rules={key === 'A' || key === 'B' ? [{ required: true, whitespace: true }] : []}>
                          <Input maxLength={1000} placeholder={`Lựa chọn ${key}`} />
                        </Form.Item>
                      ))}
                    </Space>
                    {selectedType === 'MCQ' ? (
                      <Form.Item name="correctKey" label="Đáp án đúng" rules={[{ required: true }]}>
                        <Select style={{ width: 100 }} options={['A', 'B', 'C', 'D'].map(value => ({ value, label: value }))} />
                      </Form.Item>
                    ) : (
                      <Form.Item name="correctKeys" label="Các đáp án đúng" rules={[{ required: true, type: 'array', min: 1 }]}>
                        <Checkbox.Group options={['A', 'B', 'C', 'D'].map(value => ({ value, label: value }))} />
                      </Form.Item>
                    )}
                  </>
                )}

                {selectedType === 'TRUE_FALSE_4' && (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {[1, 2, 3, 4].map(index => (
                      <Space key={index} wrap align="start" style={{ width: '100%' }}>
                        <Form.Item name={`statement${index}`} label={`Ý ${String.fromCharCode(96 + index)}`} rules={[{ required: true, whitespace: true }]} style={{ flex: 1, minWidth: 260 }}>
                          <Input maxLength={2000} placeholder={`Nhập mệnh đề ${index}`} />
                        </Form.Item>
                        <Form.Item name={`correctAnswer${index}`} label="Đáp án" rules={[{ required: true }]} style={{ width: 150 }}>
                          <Select options={[{ value: 'true', label: 'Đúng' }, { value: 'false', label: 'Sai' }]} />
                        </Form.Item>
                      </Space>
                    ))}
                    <Typography.Text type="secondary">Chấm theo số ý đúng: 0, 0,1, 0,25, 0,5 hoặc toàn điểm câu.</Typography.Text>
                  </Space>
                )}

                {selectedType === 'SHORT_ANSWER' && (
                  <Form.Item name="acceptedAnswers" label="Đáp án được chấp nhận (mỗi đáp án một dòng)" rules={[{ required: true, whitespace: true }]}>
                    <Input.TextArea rows={3} maxLength={5000} placeholder={'Ví dụ:\nHà Nội\nHa Noi'} />
                  </Form.Item>
                )}

                <div style={{ textAlign: 'right' }}>
                  <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>Thêm câu</Button>
                </div>
              </Form>
            </Card>
          ),
        },
      ]}
    />
  );
};

export default ExamQuestionInputTabs;
