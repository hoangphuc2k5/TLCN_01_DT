import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import {
  createExamApi,
  downloadImportTemplateApi,
  getAttemptsApi,
  getClassesApi,
  getExamApi,
  getExamsApi,
  getSubjectsApi,
  parseExamQuestionsApi,
  saveAttemptDraftApi,
  startAttemptApi,
  submitAttemptApi,
  updateExamApi,
} from '../../services/api.service';
import { ROLES } from '../../constants/roles';
import { can } from '../../utils/permissions';
import ImportExcelButton from '../../components/ImportExcelButton';
import { parseTextExam } from '../../utils/exam-parser';

const ExamsPage = () => {
  const { user } = useSelector((s) => s.auth);
  const canManage = can(user, 'exams', 'create');
  const isStudent = user?.role === ROLES.STUDENT && can(user, 'exams', 'execute');

  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [taking, setTaking] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [deadlineAt, setDeadlineAt] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState({});
  const submitRef = useRef(null);
  const [form] = Form.useForm();

  // Create exam questions state
  const [questions, setQuestions] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [manualForm] = Form.useForm();
  const [manualType, setManualType] = useState('MCQ');

  const load = useCallback(async () => {
    const [e, a] = await Promise.all([getExamsApi(), getAttemptsApi()]);
    if (e?.EC === 0) setExams(e.data || []);
    if (a?.EC === 0) setAttempts(a.data || []);
  }, []);

  useEffect(() => {
    (async () => {
      if (canManage) {
        const [c, s] = await Promise.all([getClassesApi(), getSubjectsApi()]);
        if (c?.EC === 0) setClasses(c.data || []);
        if (s?.EC === 0) setSubjects(s.data || []);
      }
      load();
    })();
  }, [canManage, load]);

  const startExam = async (examId) => {
    const start = await startAttemptApi(examId);
    if (start?.EC !== 0) return message.error(start?.EM);
    setAttemptId(start.data._id);
    setDeadlineAt(start.data.expiresAt ? new Date(start.data.expiresAt).getTime() : null);
    const detail = await getExamApi(examId);
    if (detail?.EC === 0) {
      const order = (start.data.questionOrder || []).map(String);
      const questionsSorted = order.length
        ? [...(detail.data.questions || [])].sort((a, b) => order.indexOf(String(a._id)) - order.indexOf(String(b._id)))
        : detail.data.questions;
      setTaking({ ...detail.data, questions: questionsSorted });
      setAnswers(
        Object.fromEntries(
          (start.data.answers || []).map((answer) => [
            answer.questionId,
            { answerKey: answer.answerKey || '', answerText: answer.answerText || '' },
          ])
        )
      );
    }
  };

  const submit = async () => {
    if (submitting || !attemptId || !taking) return;
    setSubmitting(true);
    const payload = (taking.questions || []).map((q) => ({
      questionId: q._id,
      answerKey: answers[q._id]?.answerKey || '',
      answerText: answers[q._id]?.answerText || '',
    }));
    const res = await submitAttemptApi(attemptId, payload);
    if (res?.EC === 0) {
      message.success(
        res.data.score == null
          ? 'Nộp bài thành công — điểm chưa công bố'
          : `Nộp bài thành công — Điểm MCQ: ${res.data.score}/${res.data.maxScore}`
      );
      setTaking(null);
      setAttemptId(null);
      setDeadlineAt(null);
      setRemainingSeconds(null);
      load();
    } else message.error(res?.EM);
    setSubmitting(false);
  };

  submitRef.current = submit;
  useEffect(() => {
    if (!taking || !deadlineAt) return undefined;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      if (seconds === 0) submitRef.current?.();
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [taking, deadlineAt]);

  useEffect(() => {
    if (!taking || !attemptId || !Object.keys(answers).length) return undefined;
    const timer = window.setTimeout(async () => {
      const payload = (taking.questions || [])
        .map((q) => ({
          questionId: q._id,
          answerKey: answers[q._id]?.answerKey || '',
          answerText: answers[q._id]?.answerText || '',
        }))
        .filter((answer) => answer.answerKey || answer.answerText);
      if (!payload.length) return;
      const result = await saveAttemptDraftApi(attemptId, payload);
      if (result?.EC !== 0 && result?.EM) message.warning(result.EM);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [answers, attemptId, taking]);

  const formatRemaining = (seconds) => {
    if (seconds == null) return '--:--';
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };

  // Download template Excel for questions
  const downloadTemplate = async () => {
    try {
      const blob = await downloadImportTemplateApi('exams');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mau-import-de-thi.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Không tải được file mẫu');
    }
  };

  // Upload Excel file to parse questions
  const handleUploadExcel = async (file) => {
    setImportLoading(true);
    try {
      const res = await parseExamQuestionsApi(file);
      if (res?.EC === 0) {
        const parsed = (res.data?.questions || []).map((q, idx) => ({
          ...q,
          _tempId: `xl_${Date.now()}_${idx}`,
        }));
        setQuestions((prev) => [...prev, ...parsed]);
        message.success(`Đã nạp ${parsed.length} câu hỏi từ file Excel`);
      } else {
        message.error(res?.EM || 'Không đọc được câu hỏi từ file');
      }
    } catch (err) {
      message.error(err?.response?.data?.EM || 'Lỗi khi đọc file Excel');
    } finally {
      setImportLoading(false);
    }
    return false;
  };

  // Handle parsing text
  const handleParseText = () => {
    if (!pastedText.trim()) {
      return message.warning('Vui lòng dán nội dung đề thi vào ô văn bản');
    }
    const parsed = parseTextExam(pastedText);
    if (!parsed.length) {
      return message.warning('Không tìm thấy câu hỏi hợp lệ trong đoạn văn bản');
    }
    setQuestions((prev) => [...prev, ...parsed]);
    message.success(`Đã bóc tách thành công ${parsed.length} câu hỏi`);
    setPastedText('');
  };

  // Handle adding manual question
  const handleAddManual = (values) => {
    if (manualType === 'MCQ') {
      const options = [];
      if (values.optA) options.push({ key: 'A', text: values.optA });
      if (values.optB) options.push({ key: 'B', text: values.optB });
      if (values.optC) options.push({ key: 'C', text: values.optC });
      if (values.optD) options.push({ key: 'D', text: values.optD });
      if (options.length < 2) {
        return message.warning('Trắc nghiệm cần ít nhất 2 lựa chọn (A, B)');
      }
      const newQ = {
        _tempId: `man_${Date.now()}`,
        type: 'MCQ',
        prompt: values.prompt,
        options,
        correctKey: values.correctKey || 'A',
        points: Number(values.points) || 1,
      };
      setQuestions((prev) => [...prev, newQ]);
    } else {
      const newQ = {
        _tempId: `man_${Date.now()}`,
        type: 'ESSAY',
        prompt: values.prompt,
        options: [],
        correctKey: '',
        points: Number(values.points) || 2,
      };
      setQuestions((prev) => [...prev, newQ]);
    }
    manualForm.resetFields();
    manualForm.setFieldsValue({ type: manualType, points: manualType === 'MCQ' ? 1 : 2, correctKey: 'A' });
    message.success('Đã thêm câu hỏi vào đề');
  };

  // Remove question from list
  const removeQuestion = (id) => {
    setQuestions((prev) => prev.filter((q) => q._tempId !== id));
  };

  // Stats
  const mcqCount = useMemo(() => questions.filter((q) => q.type === 'MCQ').length, [questions]);
  const essayCount = useMemo(() => questions.filter((q) => q.type === 'ESSAY').length, [questions]);
  const totalPoints = useMemo(
    () => questions.reduce((acc, q) => acc + (Number(q.points) || 0), 0),
    [questions]
  );

  return (
    <div>
      {canManage && (
        <Space style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            onClick={() => {
              form.resetFields();
              setQuestions([]);
              setPastedText('');
              setOpen(true);
            }}
          >
            Tạo đề thi
          </Button>
          <ImportExcelButton type="exams" onDone={load} label="Import đề thi (Excel)" />
        </Space>
      )}

      <Table
        rowKey="_id"
        dataSource={exams}
        style={{ marginBottom: 24 }}
        columns={[
          { title: 'Đề thi', dataIndex: 'title' },
          { title: 'Môn', render: (_, r) => r.subjectId?.name || '-' },
          { title: 'Lớp', render: (_, r) => r.classId?.name || '-' },
          {
            title: 'Số câu',
            render: (_, r) => `${r.questions?.length || 0} câu`,
          },
          {
            title: 'Thời gian',
            render: (_, r) => `${r.durationMinutes || 45} phút`,
          },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (v) => <Tag color={v === 'PUBLISHED' ? 'green' : 'orange'}>{v === 'PUBLISHED' ? 'Đã mở' : 'Bản nháp'}</Tag>,
          },
          {
            title: 'Thao tác',
            render: (_, r) => (
              <Space>
                {isStudent && r.status === 'PUBLISHED' && (
                  <Button size="small" type="primary" onClick={() => startExam(r._id)}>
                    Làm bài
                  </Button>
                )}
                {can(user, 'exams', 'update') && r.status === 'DRAFT' && (
                  <Button
                    size="small"
                    onClick={async () => {
                      const res = await updateExamApi(r._id, { status: 'PUBLISHED' });
                      if (res?.EC === 0) {
                        message.success('Đã mở đề');
                        load();
                      } else message.error(res?.EM);
                    }}
                  >
                    Mở đề
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />

      <strong>Lịch sử bài làm</strong>
      <Table
        style={{ marginTop: 8 }}
        rowKey="_id"
        dataSource={attempts}
        columns={[
          { title: 'Đề', render: (_, r) => r.examId?.title },
          { title: 'HS', render: (_, r) => r.studentId?.name },
          {
            title: 'Điểm',
            render: (_, r) => (r.score == null ? 'Chưa công bố' : `${r.score}/${r.maxScore}`),
          },
          { title: 'TT', dataIndex: 'status' },
        ]}
      />

      {/* Modal làm bài thi cho học sinh */}
      <Modal
        open={!!taking}
        title={taking?.title}
        onCancel={() => {
          setTaking(null);
          setAttemptId(null);
          setDeadlineAt(null);
        }}
        onOk={submit}
        confirmLoading={submitting}
        okText="Nộp bài"
        width={720}
      >
        <div
          style={{
            marginBottom: 16,
            fontWeight: 600,
            color: remainingSeconds != null && remainingSeconds <= 60 ? '#cf1322' : undefined,
          }}
        >
          Thời gian còn lại: {formatRemaining(remainingSeconds)}
        </div>
        {(taking?.questions || []).map((q, idx) => (
          <div key={q._id} style={{ marginBottom: 16 }}>
            <div>
              <strong>
                Câu {idx + 1}. ({q.points}đ)
              </strong>{' '}
              {q.prompt}
            </div>
            {q.type === 'MCQ' ? (
              <Radio.Group
                style={{ marginTop: 8 }}
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [q._id]: { answerKey: e.target.value },
                  }))
                }
                value={answers[q._id]?.answerKey}
              >
                {(q.options || []).map((o) => (
                  <Radio key={o.key} value={o.key} style={{ display: 'block' }}>
                    {o.key}. {o.text}
                  </Radio>
                ))}
              </Radio.Group>
            ) : (
              <Input.TextArea
                style={{ marginTop: 8 }}
                rows={3}
                value={answers[q._id]?.answerText || ''}
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [q._id]: { answerText: e.target.value },
                  }))
                }
              />
            )}
          </div>
        ))}
      </Modal>

      {/* Modal Tạo đề thi nâng cao hỗ trợ nhập File / Word / Thủ công */}
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
    </div>
  );
};

export default ExamsPage;
