import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Form, Space, Table, Tag, message } from 'antd';
import { useSelector } from 'react-redux';
import {
  getAttemptsApi,
  getClassesApi,
  getExamApi,
  getExamsApi,
  getSubjectsApi,
  saveAttemptDraftApi,
  startAttemptApi,
  submitAttemptApi,
  updateExamApi,
} from '../../services/api.service';
import { ROLES } from '../../constants/roles';
import { can } from '../../utils/permissions';
import ImportExcelButton from '../../components/ImportExcelButton';
import ExamAttemptModal from './ExamAttemptModal';
import ExamBuilderModal from './ExamBuilderModal';
import useExamQuestionDrafts from './useExamQuestionDrafts';

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
  const {
    questions, setQuestions, importLoading, pastedText, setPastedText, manualForm, manualType, setManualType,
    downloadTemplate, handleUploadExcel, handleParseText, handleAddManual, removeQuestion, mcqCount, essayCount, totalPoints,
  } = useExamQuestionDrafts();

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

      <ExamAttemptModal taking={taking} setTaking={setTaking} setAttemptId={setAttemptId} setDeadlineAt={setDeadlineAt} submit={submit} submitting={submitting} remainingSeconds={remainingSeconds} formatRemaining={formatRemaining} answers={answers} setAnswers={setAnswers} />

      <ExamBuilderModal open={open} setOpen={setOpen} form={form} questions={questions} setQuestions={setQuestions} classes={classes} subjects={subjects} downloadTemplate={downloadTemplate} importLoading={importLoading} handleUploadExcel={handleUploadExcel} pastedText={pastedText} setPastedText={setPastedText} handleParseText={handleParseText} manualForm={manualForm} handleAddManual={handleAddManual} manualType={manualType} setManualType={setManualType} mcqCount={mcqCount} essayCount={essayCount} totalPoints={totalPoints} removeQuestion={removeQuestion} load={load} />
    </div>
  );
};

export default ExamsPage;
