import { Button, Divider, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { createExamApi } from '../../services/api/learning.api';
import ExamQuestionInputTabs from './ExamQuestionInputTabs';

const ExamBuilderModal = ({ open, setOpen, form, questions, setQuestions, classes, subjects, downloadTemplate, importLoading, handleUploadExcel, pastedText, setPastedText, handleParseText, manualForm, handleAddManual, manualType, setManualType, mcqCount, essayCount, totalPoints, removeQuestion, load }) => (
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
            let finalQuestions = questions.map(({ _tempId, ...rest }) => rest);
            // Backward compatibility if user entered q1 in simple mode
            if (!finalQuestions.length && v.q1) {
              finalQuestions = [
                {
                  type: 'MCQ',
                  prompt: v.q1,
                  options: [
                    { key: 'A', text: v.a1 || 'A' },
                    { key: 'B', text: v.b1 || 'B' },
                    { key: 'C', text: v.c1 || 'C' },
                  ],
                  correctKey: v.correct1 || 'A',
                  points: 1,
                },
                ...(v.essay
                  ? [
                      {
                        type: 'ESSAY',
                        prompt: v.essay,
                        options: [],
                        points: 2,
                      },
                    ]
                  : []),
              ];
            }

            if (!finalQuestions.length) {
              return message.error('Vui lòng thêm ít nhất 1 câu hỏi cho đề thi (từ file Excel, dán văn bản hoặc thêm thủ công)');
            }

            const res = await createExamApi({
              title: v.title,
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

          <Divider style={{ margin: '12px 0' }}>Phương thức thêm câu hỏi vào đề</Divider>

          <ExamQuestionInputTabs downloadTemplate={downloadTemplate} importLoading={importLoading} handleUploadExcel={handleUploadExcel} pastedText={pastedText} setPastedText={setPastedText} handleParseText={handleParseText} manualForm={manualForm} handleAddManual={handleAddManual} manualType={manualType} setManualType={setManualType} />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              margin: '16px 0 8px',
            }}
          >
            <Typography.Text strong>
              Danh sách câu hỏi trong đề ({questions.length} câu: {mcqCount} trắc nghiệm, {essayCount} tự luận — Tổng điểm: {totalPoints}đ)
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
                width: 110,
                dataIndex: 'type',
                render: (type) =>
                  type === 'MCQ' ? <Tag color="blue">Trắc nghiệm</Tag> : <Tag color="orange">Tự luận</Tag>,
              },
              {
                title: 'Nội dung & Đáp án',
                render: (_, r) => (
                  <div>
                    <div>
                      <strong>{r.prompt}</strong>
                    </div>
                    {r.type === 'MCQ' && (
                      <Space wrap size="small" style={{ marginTop: 4 }}>
                        {(r.options || []).map((opt) => (
                          <Tag
                            key={opt.key}
                            color={opt.key === r.correctKey ? 'green' : undefined}
                            style={{ fontWeight: opt.key === r.correctKey ? 600 : 400 }}
                          >
                            {opt.key}. {opt.text} {opt.key === r.correctKey && '✓'}
                          </Tag>
                        ))}
                      </Space>
                    )}
                  </div>
                ),
              },
              {
                title: 'Điểm',
                width: 70,
                dataIndex: 'points',
                render: (pts) => `${pts}đ`,
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
