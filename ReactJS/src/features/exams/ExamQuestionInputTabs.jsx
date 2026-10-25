import { Button, Card, Form, Input, InputNumber, Select, Space, Tabs, Typography, Upload } from 'antd';
import { DownloadOutlined, FileExcelOutlined, FileTextOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';

const ExamQuestionInputTabs = ({ downloadTemplate, importLoading, handleUploadExcel, pastedText, setPastedText, handleParseText, manualForm, handleAddManual, manualType, setManualType }) => (
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
);

export default ExamQuestionInputTabs;
