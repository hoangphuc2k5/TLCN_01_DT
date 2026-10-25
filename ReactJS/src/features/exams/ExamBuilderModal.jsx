import { Button, Card, Divider, Form, Input, InputNumber, Modal, Select, Space, Table, Tabs, Tag, Typography, Upload, message } from 'antd';
import { DeleteOutlined, DownloadOutlined, FileExcelOutlined, FileTextOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { createExamApi } from '../../services/api.service';

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

          <Tabs
            defaultActiveKey="excel"
            items={[
              {
                key: 'excel',
                label: (
                  <span>
                    <FileExcelOutlined /> Nhập từ file Excel (.xlsx)
                  </span>
                ),
                children: (
                  <Card size="small" style={{ background: '#fafafa', marginBottom: 16 }}>
                    <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
                      Tải file mẫu Excel (.xlsx), soạn câu hỏi và các đáp án A, B, C, D rồi tải lên. Hệ thống sẽ tự động bóc tách thành các câu hỏi trong đề.
                    </Typography.Paragraph>
                    <Space wrap>
                      <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
                        Tải file mẫu Excel (.xlsx)
                      </Button>
                      <Upload accept=".xlsx,.xls" showUploadList={false} beforeUpload={handleUploadExcel}>
                        <Button type="primary" loading={importLoading} icon={<UploadOutlined />}>
                          Chọn file Excel để tải lên
                        </Button>
                      </Upload>
                    </Space>
                  </Card>
                ),
              },
              {
                key: 'text',
                label: (
                  <span>
                    <FileTextOutlined /> Dán văn bản (Word / Aiken)
                  </span>
                ),
                children: (
                  <Card size="small" style={{ background: '#fafafa', marginBottom: 16 }}>
                    <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
                      Sao chép đề thi từ Word/Notepad và dán vào bên dưới theo định dạng câu hỏi trắc nghiệm hoặc tự luận:
                    </Typography.Paragraph>
                    <Input.TextArea
                      rows={5}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder={`Ví dụ:\nCâu 1: Thủ đô của Việt Nam là gì?\nA. Hà Nội\nB. Đà Nẵng\nC. TP.HCM\nD. Cần Thơ\nĐáp án: A\n\nCâu 2: Số nguyên tố chẵn duy nhất là số mấy?\nA. 0\nB. 2\nC. 4\nD. 6\nĐáp án: B\n\nCâu 3: Nêu cảm nghĩ của em về ngày khai giảng.`}
                    />
                    <div style={{ marginTop: 10, textAlign: 'right' }}>
                      <Button type="primary" icon={<FileTextOutlined />} onClick={handleParseText}>
                        Bóc tách câu hỏi và thêm vào đề
                      </Button>
                    </div>
                  </Card>
                ),
              },
              {
                key: 'manual',
                label: (
                  <span>
                    <PlusOutlined /> Thêm thủ công từng câu
                  </span>
                ),
                children: (
                  <Card size="small" style={{ background: '#fafafa', marginBottom: 16 }}>
                    <Form
                      form={manualForm}
                      layout="vertical"
                      initialValues={{ type: 'MCQ', points: 1, correctKey: 'A' }}
                      onFinish={handleAddManual}
                    >
                      <Space wrap style={{ width: '100%', marginBottom: 8 }}>
                        <Form.Item name="type" label="Loại câu" style={{ minWidth: 140 }}>
                          <Select
                            onChange={(val) => {
                              setManualType(val);
                              manualForm.setFieldValue('points', val === 'MCQ' ? 1 : 2);
                            }}
                            options={[
                              { value: 'MCQ', label: 'Trắc nghiệm (MCQ)' },
                              { value: 'ESSAY', label: 'Tự luận' },
                            ]}
                          />
                        </Form.Item>
                        <Form.Item name="points" label="Điểm số" style={{ minWidth: 100 }}>
                          <InputNumber min={0.25} step={0.25} max={10} style={{ width: '100%' }} />
                        </Form.Item>
                      </Space>

                      <Form.Item name="prompt" label="Nội dung câu hỏi" rules={[{ required: true, message: 'Nhập câu hỏi' }]}>
                        <Input.TextArea rows={2} placeholder="Nhập nội dung câu hỏi..." />
                      </Form.Item>

                      {manualType === 'MCQ' && (
                        <Space wrap style={{ width: '100%' }}>
                          <Form.Item name="optA" label="Phương án A" rules={[{ required: true }]}>
                            <Input placeholder="Lựa chọn A" />
                          </Form.Item>
                          <Form.Item name="optB" label="Phương án B" rules={[{ required: true }]}>
                            <Input placeholder="Lựa chọn B" />
                          </Form.Item>
                          <Form.Item name="optC" label="Phương án C">
                            <Input placeholder="Lựa chọn C" />
                          </Form.Item>
                          <Form.Item name="optD" label="Phương án D">
                            <Input placeholder="Lựa chọn D" />
                          </Form.Item>
                          <Form.Item name="correctKey" label="Đáp án đúng" rules={[{ required: true }]}>
                            <Select
                              style={{ width: 80 }}
                              options={[
                                { value: 'A', label: 'A' },
                                { value: 'B', label: 'B' },
                                { value: 'C', label: 'C' },
                                { value: 'D', label: 'D' },
                              ]}
                            />
                          </Form.Item>
                        </Space>
                      )}

                      <div style={{ textAlign: 'right' }}>
                        <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                          Thêm câu này
                        </Button>
                      </div>
                    </Form>
                  </Card>
                ),
              },
            ]}
          />

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
