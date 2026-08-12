import { useEffect, useState } from 'react';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import { useSelector } from 'react-redux';
import {
  createExamApi,
  getAttemptsApi,
  getClassesApi,
  getExamApi,
  getExamsApi,
  getSubjectsApi,
  startAttemptApi,
  submitAttemptApi,
  updateExamApi,
} from '../../api';
import { ROLES } from '../../constants/roles';

const ExamsPage = () => {
  const { user } = useSelector((s) => s.auth);
  const canManage = [
    ROLES.SUBJECT_TEACHER,
    ROLES.HOMEROOM_TEACHER,
    ROLES.SCHOOL_ADMIN,
    ROLES.ACADEMIC_AFFAIRS,
  ].includes(user?.role);
  const isStudent = user?.role === ROLES.STUDENT;

  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [taking, setTaking] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [form] = Form.useForm();

  const load = async () => {
    const [e, a] = await Promise.all([getExamsApi(), getAttemptsApi()]);
    if (e?.EC === 0) setExams(e.data || []);
    if (a?.EC === 0) setAttempts(a.data || []);
  };

  useEffect(() => {
    (async () => {
      if (canManage) {
        const [c, s] = await Promise.all([getClassesApi(), getSubjectsApi()]);
        if (c?.EC === 0) setClasses(c.data || []);
        if (s?.EC === 0) setSubjects(s.data || []);
      }
      load();
    })();
  }, []);

  const startExam = async (examId) => {
    const start = await startAttemptApi(examId);
    if (start?.EC !== 0) return message.error(start?.EM);
    setAttemptId(start.data._id);
    const detail = await getExamApi(examId);
    if (detail?.EC === 0) {
      setTaking(detail.data);
      setAnswers({});
    }
  };

  const submit = async () => {
    const payload = (taking.questions || []).map((q) => ({
      questionId: q._id,
      answerKey: answers[q._id]?.answerKey || '',
      answerText: answers[q._id]?.answerText || '',
    }));
    const res = await submitAttemptApi(attemptId, payload);
    if (res?.EC === 0) {
      message.success(`Nộp bài thành công — Điểm MCQ: ${res.data.score}/${res.data.maxScore}`);
      setTaking(null);
      load();
    } else message.error(res?.EM);
  };

  return (
    <div>
      {canManage && (
        <Button type="primary" style={{ marginBottom: 16 }} onClick={() => setOpen(true)}>
          Tạo đề thi
        </Button>
      )}
      <Table
        rowKey="_id"
        dataSource={exams}
        style={{ marginBottom: 24 }}
        columns={[
          { title: 'Đề thi', dataIndex: 'title' },
          { title: 'Môn', render: (_, r) => r.subjectId?.name },
          { title: 'Lớp', render: (_, r) => r.classId?.name },
          {
            title: 'TT',
            dataIndex: 'status',
            render: (v) => <Tag>{v}</Tag>,
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
                {canManage && r.status === 'DRAFT' && (
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
          { title: 'Điểm', render: (_, r) => `${r.score}/${r.maxScore}` },
          { title: 'TT', dataIndex: 'status' },
        ]}
      />

      <Modal
        open={!!taking}
        title={taking?.title}
        onCancel={() => setTaking(null)}
        onOk={submit}
        okText="Nộp bài"
        width={720}
      >
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

      <Modal open={open} title="Tạo đề thi nhanh" onCancel={() => setOpen(false)} onOk={() => form.submit()} width={640}>
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            const questions = [
              {
                type: 'MCQ',
                prompt: v.q1,
                options: [
                  { key: 'A', text: v.a1 },
                  { key: 'B', text: v.b1 },
                  { key: 'C', text: v.c1 },
                ],
                correctKey: v.correct1,
                points: 1,
              },
              {
                type: 'ESSAY',
                prompt: v.essay || 'Câu tự luận',
                options: [],
                points: 2,
              },
            ];
            const res = await createExamApi({
              title: v.title,
              classId: v.classId,
              subjectId: v.subjectId,
              status: 'DRAFT',
              questions,
              durationMinutes: v.durationMinutes || 30,
            });
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpen(false);
              form.resetFields();
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="classId" label="Lớp">
            <Select allowClear options={classes.map((c) => ({ value: c._id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="subjectId" label="Môn">
            <Select allowClear options={subjects.map((s) => ({ value: s._id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="durationMinutes" label="Thời gian (phút)" initialValue={30}>
            <InputNumber min={5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="q1" label="Câu MCQ" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space wrap>
            <Form.Item name="a1" label="A" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="b1" label="B" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="c1" label="C" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="correct1" label="Đáp án" rules={[{ required: true }]}>
              <Select
                style={{ width: 80 }}
                options={[
                  { value: 'A', label: 'A' },
                  { value: 'B', label: 'B' },
                  { value: 'C', label: 'C' },
                ]}
              />
            </Form.Item>
          </Space>
          <Form.Item name="essay" label="Câu tự luận">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExamsPage;
