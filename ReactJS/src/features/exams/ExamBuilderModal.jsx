import { Alert, Button, Card, Divider, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { createExamApi } from '../../services/api/learning.api';
import ExamQuestionInputTabs from './ExamQuestionInputTabs';

const createCustomSections = () => [{ key: `section_${Date.now()}`, title: 'Phần 1', instructions: '', order: 0, questionType: null }];
const createThptSections = () => [
  { key: 'thpt_part_1', title: 'Phần I - Trắc nghiệm nhiều lựa chọn', instructions: '', order: 0, questionType: 'MCQ' },
  { key: 'thpt_part_2', title: 'Phần II - Trắc nghiệm Đúng/Sai', instructions: '', order: 1, questionType: 'TRUE_FALSE_4' },
  { key: 'thpt_part_3', title: 'Phần III - Trả lời ngắn', instructions: '', order: 2, questionType: 'SHORT_ANSWER' },
];

const ExamBuilderModal = ({ open, setOpen, form, questions, setQuestions, template, setTemplate, sections, setSections, classes, subjects, downloadTemplate, importLoading, handleUploadExcel, pastedText, setPastedText, handleParseText, manualForm, handleAddManual, manualType, setManualType, mcqCount, essayCount, totalPoints, removeQuestion, updateQuestion, load }) => (
  <Modal
        open={open}
        title="Tạo đề thi mới (Hỗ trợ nhập File Excel / Word)"
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText="Tạo đề thi"
        cancelText="Hủy"
        width={840}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            const finalQuestions = questions.map(({ _tempId, ...rest }) => rest);

            if (!finalQuestions.length) {
              return message.error('Vui lòng thêm ít nhất 1 câu hỏi cho đề thi (từ file Excel, dán văn bản hoặc thêm thủ công)');
            }

            const res = await createExamApi({
              title: v.title,
              template,
              sections,
              classId: v.classId || null,
              subjectId: v.subjectId || null,
              status: 'DRAFT',
              questions: finalQuestions,
              durationMinutes: v.durationMinutes || 45,
            });
            if (res?.EC === 0) {
              message.success(res.EM || 'Tạo đề thi thành công');
              setOpen(false);
              form.resetFields();
              setQuestions([]);
              load();
            } else {
              message.error(res?.EM || 'Tạo đề thi thất bại');
            }
          }}
        >
          <Space orientation="horizontal" size="middle" style={{ width: '100%' }} wrap>
            <Form.Item
              name="title"
              label="Tiêu đề đề thi"
              rules={[{ required: true, message: 'Vui lòng nhập tiêu đề đề thi' }]}
              style={{ minWidth: 260, flex: 2 }}
            >
              <Input placeholder="VD: Kiểm tra 1 tiết - Môn Toán HK1" />
            </Form.Item>
            <Form.Item name="classId" label="Lớp học" style={{ minWidth: 150, flex: 1 }}>
              <Select allowClear placeholder="Chọn lớp" options={classes.map((c) => ({ value: c._id, label: c.name }))} />
            </Form.Item>
            <Form.Item name="subjectId" label="Môn học" style={{ minWidth: 150, flex: 1 }}>
              <Select allowClear placeholder="Chọn môn" options={subjects.map((s) => ({ value: s._id, label: s.name }))} />
            </Form.Item>
            <Form.Item
              name="durationMinutes"
              label="Thời gian (phút)"
              initialValue={45}
              rules={[{ required: true }]}
              style={{ minWidth: 120, flex: 1 }}
            >
              <InputNumber min={5} max={180} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item label="Cấu trúc đề" style={{ maxWidth: 430 }}>
            <Select
              value={template}
              onChange={value => {
                if (questions.length) return message.warning('Chọn cấu trúc đề trước khi thêm câu hỏi');
                setTemplate(value);
                setSections(value === 'THPT_2025' ? createThptSections() : createCustomSections());
                setManualType('MCQ');
                manualForm.setFieldsValue({ type: 'MCQ', sectionKey: value === 'THPT_2025' ? 'thpt_part_1' : undefined, points: 0.25 });
              }}
              options={[{ value: 'CUSTOM', label: 'Đề tự thiết kế' }, { value: 'THPT_2025', label: 'Mẫu cấu trúc THPT' }]}
            />
          </Form.Item>
          {template === 'THPT_2025' ? (
            <>
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message={`Mẫu gồm trắc nghiệm, Đúng/Sai 4 ý và trả lời ngắn. Số câu và điểm có thể khác theo môn; tổng hiện tại ${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(totalPoints)}/10. Đề chỉ mở được khi tổng điểm bằng 10.`}
              />
              <Card size="small" title="Các phần THPT" style={{ marginBottom: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {sections.map((section, index) => (
                    <Space key={section.key} wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Typography.Text>{section.title}</Typography.Text>
                      <Tag color="blue">{({ MCQ: 'Một đáp án', TRUE_FALSE_4: 'Đúng/Sai 4 ý', SHORT_ANSWER: 'Trả lời ngắn' })[section.questionType] || section.questionType}</Tag>
                      <Button
                        aria-label={`Bỏ phần ${section.title}`}
                        danger
                        icon={<DeleteOutlined />}
                        disabled={sections.length <= 1 || questions.some(question => question.sectionKey === section.key)}
                        onClick={() => setSections(current => current.filter(item => item.key !== section.key).map((item, order) => ({ ...item, order })))}
                      />
                    </Space>
                  ))}
                </Space>
              </Card>
            </>
          ) : (
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
                      options={[
                        { value: 'MIXED', label: 'Cho phép nhiều dạng' },
                        { value: 'MCQ', label: 'Trắc nghiệm một đáp án' },
                        { value: 'MCQ_MULTI', label: 'Trắc nghiệm nhiều đáp án' },
                        { value: 'TRUE_FALSE_4', label: 'Đúng/Sai 4 ý' },
                        { value: 'SHORT_ANSWER', label: 'Trả lời ngắn' },
                        { value: 'ESSAY', label: 'Tự luận' },
                      ]}
                      style={{ width: 205 }}
                    />
                    <Button
                      aria-label={`Xóa phần ${index + 1}`}
                      danger
                      icon={<DeleteOutlined />}
                      disabled={sections.length <= 1 || questions.some(question => question.sectionKey === section.key)}
                      onClick={() => setSections(current => current.filter(item => item.key !== section.key).map((item, order) => ({ ...item, order })))}
                    />
                  </Space>
                ))}
                <Button icon={<PlusOutlined />} onClick={() => setSections(current => [...current, { key: `section_${Date.now()}`, title: `Phần ${current.length + 1}`, instructions: '', order: current.length, questionType: null }])}>Thêm phần</Button>
              </Space>
            </Card>
          )}

          <Divider style={{ margin: '12px 0' }}>Phương thức thêm câu hỏi vào đề</Divider>

          <ExamQuestionInputTabs downloadTemplate={downloadTemplate} importLoading={importLoading} handleUploadExcel={handleUploadExcel} pastedText={pastedText} setPastedText={setPastedText} handleParseText={handleParseText} manualForm={manualForm} handleAddManual={handleAddManual} manualType={manualType} setManualType={setManualType} sections={sections} />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              margin: '16px 0 8px',
            }}
          >
              <Typography.Text strong>
              Danh sách câu hỏi trong đề ({questions.length} câu: {mcqCount} trắc nghiệm, {essayCount} tự luận — Tổng điểm: {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(totalPoints)}đ{template === 'THPT_2025' ? ' / 10' : ''})
            </Typography.Text>
            {questions.length > 0 && (
              <Button danger size="small" onClick={() => setQuestions([])}>
                Xóa tất cả
              </Button>
            )}
          </div>

          <Table
            size="small"
            rowKey={(r) => r._tempId || r.prompt}
            dataSource={questions}
            pagination={{ pageSize: 5 }}
            locale={{ emptyText: 'Chưa có câu hỏi nào. Hãy tải file Excel hoặc dán văn bản ở trên.' }}
            columns={[
              {
                title: 'STT',
                width: 50,
                render: (_, __, idx) => idx + 1,
              },
              {
                title: 'Loại',
                width: 150,
                dataIndex: 'type',
                render: (type) => <Tag color={type === 'ESSAY' ? 'orange' : type === 'TRUE_FALSE_4' ? 'purple' : 'blue'}>{({ MCQ: 'Trắc nghiệm', MCQ_MULTI: 'Nhiều đáp án', TRUE_FALSE_4: 'Đúng/Sai 4 ý', SHORT_ANSWER: 'Trả lời ngắn', ESSAY: 'Tự luận' })[type] || type}</Tag>,
              },
              { title: 'Phần', width: 190, render: (_, question) => sections.find(section => section.key === question.sectionKey)?.title || '—' },
              {
                title: 'Nội dung & Đáp án',
                render: (_, r) => (
                  <div>
                    <div>
                      <strong>{r.prompt}</strong>
                    </div>
                    {(r.type === 'MCQ' || r.type === 'MCQ_MULTI') && (
                      <Space wrap size="small" style={{ marginTop: 4 }}>
                        {(r.options || []).map((opt) => (
                          <Tag
                            key={opt.key}
                            color={opt.key === r.correctKey || (r.correctKeys || []).includes(opt.key) ? 'green' : undefined}
                            style={{ fontWeight: opt.key === r.correctKey || (r.correctKeys || []).includes(opt.key) ? 600 : 400 }}
                          >
                            {opt.key}. {opt.text} {(opt.key === r.correctKey || (r.correctKeys || []).includes(opt.key)) && '✓'}
                          </Tag>
                        ))}
                      </Space>
                    )}
                    {r.type === 'TRUE_FALSE_4' && (r.statements || []).map((statement, index) => <div key={index}>{String.fromCharCode(97 + index)}. {statement.text} — {statement.correctAnswer ? 'Đúng' : 'Sai'}</div>)}
                    {r.type === 'SHORT_ANSWER' && <Typography.Text type="secondary">Đáp án: {(r.acceptedAnswers || []).join(', ')}</Typography.Text>}
                  </div>
                ),
              },
              {
                title: 'Điểm',
                width: 70,
                dataIndex: 'points',
                render: (pts, question) => <InputNumber aria-label={`Điểm câu hỏi ${question.prompt}`} min={0.1} max={10} step={0.05} value={pts} onChange={value => updateQuestion(question._tempId, { points: Number(value) || 0 })} style={{ width: 82 }} />,
              },
              {
                title: '',
                width: 50,
                render: (_, r) => (
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeQuestion(r._tempId)}
                  />
                ),
              },
            ]}
          />
        </Form>
      </Modal>
);

export default ExamBuilderModal;
