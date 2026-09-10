import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import {
  closeHomeworkApi, createHomeworkApi, getAcademicYearsApi, getHomeworkSubmissionsApi,
  getHomeworksApi, getClassesApi, getSubjectsApi, gradeHomeworkApi, publishHomeworkApi,
  submitHomeworkApi,
  uploadHomeworkAttachmentApi, downloadHomeworkAttachmentApi,
} from '../../api';
import { ROLES } from '../../constants/roles';
import { can } from '../../util/permissions';

const teacherRoles = [ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER];
const formatDate = value => value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-';

export default function AssignmentsPage() {
  const { user } = useSelector(s => s.auth);
  const manage = can(user, 'assignments', 'execute');
  const grade = can(user, 'assignments', 'update');
  const student = user?.role === ROLES.STUDENT;
  const [rows, setRows] = useState([]); const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]); const [years, setYears] = useState([]);
  const [open, setOpen] = useState(false); const [submitTarget, setSubmitTarget] = useState(null);
  const [submitFile, setSubmitFile] = useState(null);
  const [gradeTarget, setGradeTarget] = useState(null); const [submissions, setSubmissions] = useState([]);
  const [form] = Form.useForm(); const [submitForm] = Form.useForm(); const [gradeForm] = Form.useForm();
  const load = async () => { const result = await getHomeworksApi(); if (result?.EC === 0) setRows(result.data || []); };
  useEffect(() => { (async () => { if (manage) { const [c, s, y] = await Promise.all([getClassesApi(), getSubjectsApi(), getAcademicYearsApi()]); setClasses(c?.data || []); setSubjects(s?.data || []); setYears(y?.data || []); } await load(); })(); }, []);
  const openSubmissions = async row => { const result = await getHomeworkSubmissionsApi(row._id); if (result?.EC === 0) { setSubmissions(result.data || []); setGradeTarget(row); } else message.error(result?.EM); };
  const isTeacher = teacherRoles.includes(user?.role); const createTitle = useMemo(() => isTeacher ? 'Giao bài tập' : 'Tạo bài tập', [isTeacher]);
  const columns = [
    { title: 'Tiêu đề', dataIndex: 'title' }, { title: 'Lớp', render: (_, r) => r.classId?.name },
    { title: 'Môn', render: (_, r) => r.subjectId?.name }, { title: 'Hạn nộp', dataIndex: 'dueAt', render: formatDate },
    { title: 'Điểm tối đa', dataIndex: 'maxScore' }, { title: 'Trạng thái', dataIndex: 'status', render: v => <Tag color={v === 'PUBLISHED' ? 'green' : v === 'CLOSED' ? 'default' : 'gold'}>{v}</Tag> },
    { title: 'Bài của em', render: (_, r) => r.submission ? <Space direction="vertical" size={2}><span>{r.submission.score == null ? 'Đã nộp' : `${r.submission.score}/${r.maxScore}`}</span>{(r.submission.attachmentIds || []).map(file => <Button type="link" size="small" key={file._id} onClick={() => downloadHomeworkAttachmentApi(file._id, file.originalName)}>{file.originalName}</Button>)}{student && r.status === 'PUBLISHED' && r.submission.status === 'SUBMITTED' && <Button size="small" onClick={() => { submitForm.setFieldsValue({ answerText: '' }); setSubmitFile(null); setSubmitTarget(r); }}>Nộp lại / thêm file</Button>}</Space> : student && r.status === 'PUBLISHED' ? <Button size="small" onClick={() => { submitForm.resetFields(); setSubmitFile(null); setSubmitTarget(r); }}>Nộp bài</Button> : '-' },
    { title: 'Thao tác', render: (_, r) => manage ? <Space>{r.status === 'DRAFT' && <Button size="small" onClick={async () => { const x = await publishHomeworkApi(r._id); if (x?.EC === 0) { message.success(x.EM); load(); } }}>Mở bài</Button>}{r.status === 'PUBLISHED' && <Button size="small" onClick={async () => { const x = await closeHomeworkApi(r._id); if (x?.EC === 0) { message.success(x.EM); load(); } }}>Đóng bài</Button>}{(grade || isTeacher) && r.status !== 'DRAFT' && <Button size="small" onClick={() => openSubmissions(r)}>Bài nộp</Button>}</Space> : '-' },
  ];
  return <div>
    {manage && <Button type="primary" style={{ marginBottom: 16 }} onClick={() => { form.resetFields(); setOpen(true); }}>{createTitle}</Button>}
    <Table rowKey="_id" dataSource={rows} columns={columns} />
    <Modal open={open} title={createTitle} onCancel={() => setOpen(false)} onOk={() => form.submit()} width={640}>
      <Form form={form} layout="vertical" onFinish={async values => { const result = await createHomeworkApi({ ...values, dueAt: new Date(values.dueAt).toISOString(), availableFrom: values.availableFrom ? new Date(values.availableFrom).toISOString() : undefined }); if (result?.EC === 0) { message.success(result.EM); setOpen(false); load(); } else message.error(result?.EM); }}>
        <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}><Input maxLength={200} /></Form.Item>
        <Form.Item name="instructions" label="Đề bài / hướng dẫn"><Input.TextArea rows={5} maxLength={10000} /></Form.Item>
        <Form.Item name="classId" label="Lớp" rules={[{ required: true }]}><Select options={classes.map(x => ({ value: x._id, label: x.name }))} /></Form.Item>
        <Form.Item name="subjectId" label="Môn" rules={[{ required: true }]}><Select options={subjects.map(x => ({ value: x._id, label: x.name }))} /></Form.Item>
        <Form.Item name="academicYearId" label="Năm học" rules={[{ required: true }]}><Select options={years.map(x => ({ value: x._id, label: x.name }))} /></Form.Item>
        {!isTeacher && <Form.Item name="teacherId" label="ID giáo viên" rules={[{ required: true }]}><Input /></Form.Item>}
        <Form.Item name="dueAt" label="Hạn nộp" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item>
        <Form.Item name="maxScore" label="Điểm tối đa" initialValue={10} rules={[{ required: true }]}><InputNumber min={0.1} max={100} /></Form.Item>
        <Form.Item name="allowLate" label="Cho phép nộp trễ" valuePropName="checked"><input type="checkbox" /></Form.Item>
        <Form.Item name="lateUntil" label="Hạn cuối nộp trễ"><Input type="datetime-local" /></Form.Item>
      </Form>
    </Modal>
    <Modal open={!!submitTarget} title={`Nộp bài: ${submitTarget?.title || ''}`} onCancel={() => setSubmitTarget(null)} onOk={() => submitForm.submit()}>
      <Form form={submitForm} layout="vertical" onFinish={async values => { const result = await submitHomeworkApi(submitTarget._id, values); if (result?.EC !== 0) return message.error(result?.EM); if (submitFile) { const uploaded = await uploadHomeworkAttachmentApi(submitTarget._id, submitFile); if (uploaded?.EC !== 0) { message.warning(`Đã lưu nội dung nhưng chưa tải được file: ${uploaded?.EM || 'Lỗi upload'}`); return load(); } } message.success(submitFile ? 'Đã nộp bài và tải file' : result.EM); setSubmitTarget(null); setSubmitFile(null); load(); }}>
        <Form.Item name="answerText" label="Nội dung bài làm" rules={[{ required: true, whitespace: true }]}><Input.TextArea rows={10} maxLength={20000} showCount /></Form.Item>
        <Form.Item label="File đính kèm (tối đa 5 file/bài)"><input aria-label="File đính kèm" type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.docx,.xlsx,.pptx" onChange={event => setSubmitFile(event.target.files?.[0] || null)} /></Form.Item>
      </Form>
    </Modal>
    <Modal open={!!gradeTarget} title={`Bài nộp: ${gradeTarget?.title || ''}`} onCancel={() => setGradeTarget(null)} footer={null} width={760}>
      <Table size="small" rowKey="_id" dataSource={submissions} columns={[{ title: 'Student', render: (_, r) => r.studentId?.name || '' }, { title: 'Submitted', dataIndex: 'submittedAt', render: formatDate }, { title: 'Late', dataIndex: 'late', render: v => v ? 'Yes' : 'No' }, { title: 'Score', dataIndex: 'score', render: v => v == null ? 'Ungraded' : v }, { title: 'Grade', render: (_, r) => r.status === 'SUBMITTED' ? <Button size="small" onClick={() => { gradeForm.resetFields(); gradeForm.setFieldsValue({ submissionId: r._id }); }}>Grade</Button> : 'Graded' }]} />
      <Form form={gradeForm} layout="inline" onFinish={async values => { const result = await gradeHomeworkApi(values.submissionId, values); if (result?.EC === 0) { const refreshed = await getHomeworkSubmissionsApi(gradeTarget._id); setSubmissions(refreshed.data || []); gradeForm.resetFields(); message.success(result.EM); } else message.error(result?.EM); }} style={{ marginTop: 16 }}><Form.Item name="submissionId" hidden><Input /></Form.Item><Form.Item name="score" label="Score" rules={[{ required: true }]}><InputNumber min={0} max={gradeTarget?.maxScore} /></Form.Item><Form.Item name="feedback" label="Feedback"><Input style={{ width: 300 }} maxLength={10000} /></Form.Item><Button htmlType="submit" type="primary">Save</Button></Form>
    </Modal>
  </div>;
}
