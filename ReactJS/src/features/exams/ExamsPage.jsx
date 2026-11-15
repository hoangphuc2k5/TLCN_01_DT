import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Form, Space, Typography, message } from 'antd';
import { useSelector } from 'react-redux';
import {
  getAttemptsApi,
  getClassesApi,
  getExamApi,
  getExamsApi,
  getSubjectsApi,
  gradeAttemptApi,
  saveAttemptDraftApi,
  startAttemptApi,
  submitAttemptApi,
  updateExamApi,
} from '../../services/api.service';
import { ROLES } from '../../constants/roles';
import { can } from '../../utils/permissions';
import ImportExcelButton from '../../components/ImportExcelButton';
import PageShell from '../../components/layout/PageShell';
import { createExamApi } from '../../services/api/learning.api';
import ExamAttemptModal from './ExamAttemptModal';
import ExamBuilderModal from './ExamBuilderModal';
import ExamAttemptsTable from './ExamAttemptsTable';
import ExamListTable from './ExamListTable';
import EssayGradingModal from './EssayGradingModal';
import useExamQuestionDrafts from './useExamQuestionDrafts';
import { buildAttemptAnswers } from './exam-question.utils';
import './exams.css';

const ExamsPage = () => {
  const { user } = useSelector((s) => s.auth);
  const canManage = can(user, 'exams', 'create');
  const isStudent = user?.role === ROLES.STUDENT && can(user, 'exams', 'execute');

  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingExam, setSavingExam] = useState(false);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [taking, setTaking] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [deadlineAt, setDeadlineAt] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState({});
  const [gradingAttempt, setGradingAttempt] = useState(null);
  const [gradingExam, setGradingExam] = useState(null);
  const [essayGrades, setEssayGrades] = useState({});
  const [gradingBusy, setGradingBusy] = useState(false);
  const submitRef = useRef(null);
  const [form] = Form.useForm();
  const draft = useExamQuestionDrafts();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [examResponse, attemptResponse] = await Promise.all([getExamsApi(), getAttemptsApi()]);
      if (examResponse?.EC === 0) setExams(examResponse.data || []);
      else message.error(examResponse?.EM || 'Không tải được danh sách đề thi');
      if (attemptResponse?.EC === 0) setAttempts(attemptResponse.data || []);
      else message.error(attemptResponse?.EM || 'Không tải được lịch sử bài làm');
    } catch {
      message.error('Không tải được dữ liệu thi trực tuyến');
    } finally {
      setLoading(false);
    }
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

  const openExamBuilder = () => {
    form.resetFields();
    form.setFieldsValue({ durationMinutes: 45 });
    draft.resetDraft();
    setOpen(true);
  };

  const createExam = async values => {
    if (savingExam) return;
    setSavingExam(true);
    try {
      const questions = draft.questions.map(({ _tempId, ...question }) => question);
      const response = await createExamApi({
        title: values.title,
        template: draft.template,
        sections: draft.sections,
        classId: values.classId || null,
        subjectId: values.subjectId || null,
        status: 'DRAFT',
        questions,
        durationMinutes: values.durationMinutes || 45,
      });
      if (response?.EC !== 0) {
        message.error(response?.EM || 'Tạo đề thi thất bại');
        return;
      }
      message.success(response.EM || 'Tạo đề thi thành công');
      setOpen(false);
      form.resetFields();
      draft.resetDraft();
      await load();
    } catch {
      message.error('Tạo đề thi thất bại');
    } finally {
      setSavingExam(false);
    }
  };

  const publishExam = async exam => {
    try {
      const response = await updateExamApi(exam._id, { status: 'PUBLISHED' });
      if (response?.EC === 0) {
        message.success('Đã mở đề');
        await load();
      } else message.error(response?.EM || 'Không mở được đề thi');
    } catch {
      message.error('Không mở được đề thi');
    }
  };

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
            { answerKey: answer.answerKey || '', answerKeys: answer.answerKeys || [], answerFlags: answer.answerFlags || [], answerText: answer.answerText || '' },
          ])
        )
      );
    }
  };

  const submit = async () => {
    if (submitting || !attemptId || !taking) return;
    setSubmitting(true);
    const payload = buildAttemptAnswers(taking.questions || [], answers);
    const res = await submitAttemptApi(attemptId, payload);
    if (res?.EC === 0) {
      message.success(
        res.data.pendingManualGrading
          ? 'Đã nộp bài — bài tự luận đang chờ giáo viên chấm'
          : res.data.score == null
            ? 'Nộp bài thành công — điểm chưa công bố'
            : `Nộp bài thành công — ${res.data.score}/${res.data.maxScore}${res.data.scoreOutOfTen != null ? ` (${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(res.data.scoreOutOfTen)}/10)` : ''}`
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
      const payload = buildAttemptAnswers(taking.questions || [], answers)
        .filter((answer) => answer.answerKey || answer.answerKeys.length || answer.answerFlags.some(value => typeof value === 'boolean') || answer.answerText);
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

  const openEssayGrading = async attempt => {
    const examId = attempt.examId?._id || attempt.examId;
    const response = await getExamApi(examId);
    if (response?.EC !== 0) return message.error(response?.EM || 'Không tải được đề thi');
    setGradingAttempt(attempt);
    setGradingExam(response.data);
    setEssayGrades(Object.fromEntries((attempt.answers || []).map(answer => [String(answer.questionId), answer.pointsAwarded || 0])));
  };

  const saveEssayGrades = async () => {
    if (!gradingAttempt || !gradingExam || gradingBusy) return;
    setGradingBusy(true);
    const grades = (gradingExam.questions || [])
      .filter(question => question.type === 'ESSAY')
      .map(question => ({ questionId: question._id, pointsAwarded: Number(essayGrades[String(question._id)] || 0) }));
    const response = await gradeAttemptApi(gradingAttempt._id, grades);
    if (response?.EC === 0) {
      message.success('Đã lưu điểm tự luận');
      setGradingAttempt(null);
      setGradingExam(null);
      load();
    } else message.error(response?.EM || 'Không lưu được điểm');
    setGradingBusy(false);
  };

  return (
    <PageShell
      title="Thi trực tuyến"
      description="Quản lý đề thi, theo dõi bài làm và thực hiện bài kiểm tra theo cấu trúc đã giao."
      actions={canManage && (
        <Space wrap>
          <Button type="primary" onClick={openExamBuilder}>Tạo đề thi</Button>
          <ImportExcelButton type="exams" onDone={load} label="Import đề thi (Excel)" />
        </Space>
      )}
    >
      <section className="exam-page-section" aria-labelledby="exam-list-heading">
        <Typography.Title id="exam-list-heading" level={4}>Danh sách đề thi</Typography.Title>
        <ExamListTable
          exams={exams}
          loading={loading}
          isStudent={isStudent}
          canPublish={can(user, 'exams', 'update')}
          onStartExam={startExam}
          onPublishExam={publishExam}
        />
      </section>

      <section className="exam-page-section" aria-labelledby="exam-attempts-heading">
        <Typography.Title id="exam-attempts-heading" level={4}>Lịch sử bài làm</Typography.Title>
        <ExamAttemptsTable
          attempts={attempts}
          loading={loading}
          canGrade={can(user, 'exams', 'update')}
          onGradeAttempt={openEssayGrading}
        />
      </section>

      <ExamAttemptModal taking={taking} setTaking={setTaking} setAttemptId={setAttemptId} setDeadlineAt={setDeadlineAt} submit={submit} submitting={submitting} remainingSeconds={remainingSeconds} formatRemaining={formatRemaining} answers={answers} setAnswers={setAnswers} />
      <EssayGradingModal open={Boolean(gradingAttempt)} attempt={gradingAttempt} exam={gradingExam} grades={essayGrades} setGrades={setEssayGrades} saving={gradingBusy} onCancel={() => { setGradingAttempt(null); setGradingExam(null); }} onSubmit={saveEssayGrades} />
      <ExamBuilderModal open={open} setOpen={setOpen} form={form} draft={draft} classes={classes} subjects={subjects} onSubmit={createExam} saving={savingExam} />
    </PageShell>
  );
};

export default ExamsPage;
