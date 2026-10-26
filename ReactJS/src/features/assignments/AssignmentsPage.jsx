import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Space, Table, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import {
  closeHomeworkApi, downloadHomeworkAttachmentApi,
  getAcademicYearsApi, getClassesApi, getHomeworkSubmissionsApi, getHomeworksApi,
  getRetakeRequestsApi, getSubjectsApi, getUserDirectoryApi, publishHomeworkApi,
  reviewRetakeRequestApi, } from '../../services/api.service';
import { ROLES } from '../../constants/roles';
import { enumLabel } from '../../utils/enum-labels';
import { can } from '../../utils/permissions';
import AssignmentDialogs from './AssignmentDialogs';

const teacherRoles = [ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER];
const formatDate = value => value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-';
const modeLabels = { WEB: 'Làm trực tuyến', FILE: 'Nộp file', MIXED: 'Trực tuyến + file' };
const requestTypeLabels = { RETAKE_EXAM: 'Xin thi lại', REPEAT_COURSE: 'Xin học lại' };

export default function AssignmentsPage() {
  const { user } = useSelector(state => state.auth);
  const manage = can(user, 'assignments', 'execute');
  const grade = can(user, 'assignments', 'update');
  const student = user?.role === ROLES.STUDENT;
  const reviewRetake = can(user, 'retakes', 'execute');
  const seeRetakes = student || can(user, 'retakes');
  const isTeacher = teacherRoles.includes(user?.role);
  const createTitle = useMemo(() => isTeacher ? 'Giao bài tập' : 'Tạo bài tập', [isTeacher]);

  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [years, setYears] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [retakes, setRetakes] = useState([]);
  const [open, setOpen] = useState(false);
  const [submitTarget, setSubmitTarget] = useState(null);
  const [submitFile, setSubmitFile] = useState(null);
  const [gradeTarget, setGradeTarget] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [retakeOpen, setRetakeOpen] = useState(false);
  const [form] = Form.useForm();
  const [submitForm] = Form.useForm();
  const [gradeForm] = Form.useForm();
  const [retakeForm] = Form.useForm();
  const submissionMode = Form.useWatch('submissionMode', submitForm) || 'WEB';

  const loadHomeworks = useCallback(async () => {
    const result = await getHomeworksApi();
    if (result?.EC === 0) setRows(result.data || []);
  }, []);
  const loadRetakes = useCallback(async () => {
    if (!seeRetakes) return;
    const result = await getRetakeRequestsApi();
    if (result?.EC === 0) setRetakes(result.data || []);
  }, [seeRetakes]);

  useEffect(() => {
    (async () => {
      const requests = [];
      if (manage) {
        requests.push(getClassesApi().then(result => setClasses(result?.data || [])));
        if (!isTeacher) {
          requests.push(
            Promise.all([
              getUserDirectoryApi({ role: ROLES.SUBJECT_TEACHER }),
              getUserDirectoryApi({ role: ROLES.HOMEROOM_TEACHER }),
            ]).then(([t, h]) => setTeachers([...(t?.data || []), ...(h?.data || [])]))
          );
        }
      }
      if (manage || seeRetakes) {
        requests.push(getSubjectsApi().then(result => setSubjects(result?.data || [])));
        requests.push(getAcademicYearsApi().then(result => setYears(result?.data || [])));
      }
      await Promise.all(requests);
      await Promise.all([loadHomeworks(), loadRetakes()]);
    })();
  }, [isTeacher, loadHomeworks, loadRetakes, manage, seeRetakes]);

  const startSubmission = row => {
    const mode = row.submission?.status === 'UPLOADING' ? 'FILE' : 'WEB';
    submitForm.resetFields();
    submitForm.setFieldsValue({ submissionMode: mode, answerText: '' });
    setSubmitFile(null);
    setSubmitTarget(row);
  };
  const openSubmissions = async row => {
    const result = await getHomeworkSubmissionsApi(row._id);
    if (result?.EC === 0) {
      setSubmissions(result.data || []);
      setGradeTarget(row);
    } else message.error(result?.EM);
  };
  const reviewRequest = async (row, status) => {
    const result = await reviewRetakeRequestApi(row._id, { status });
    if (result?.EC === 0) {
      message.success(result.EM);
      loadRetakes();
    } else message.error(result?.EM);
  };

  const columns = [
    { title: 'Tiêu đề', dataIndex: 'title' },
    { title: 'Lớp', render: (_, row) => row.classId?.name },
    { title: 'Môn', render: (_, row) => row.subjectId?.name },
    { title: 'Hạn nộp', dataIndex: 'dueAt', render: formatDate },
    { title: 'Điểm tối đa', dataIndex: 'maxScore' },
    { title: 'Trạng thái', dataIndex: 'status', render: value => <Tag color={value === 'PUBLISHED' ? 'green' : value === 'CLOSED' ? 'default' : 'gold'}>{enumLabel(value)}</Tag> },
    {
      title: 'Bài của em',
      render: (_, row) => row.submission ? <Space direction="vertical" size={2}>
        <span>{row.submission.status === 'UPLOADING' ? 'Chờ tải file' : row.submission.score == null ? 'Đã nộp' : `${row.submission.score}/${row.maxScore}`}</span>
        <Tag>{modeLabels[row.submission.submissionMode] || row.submission.submissionMode}</Tag>
        {row.submission.status === 'GRADED' && row.submission.feedback?.trim() && (
          <span><strong>Nhận xét:</strong> {row.submission.feedback}</span>
        )}
        {(row.submission.attachmentIds || []).map(file => <Button type="link" size="small" key={file._id} onClick={() => downloadHomeworkAttachmentApi(file._id, file.originalName)}>{file.originalName}</Button>)}
        {student && row.status === 'PUBLISHED' && row.submission.status !== 'GRADED' && <Button size="small" onClick={() => startSubmission(row)}>{row.submission.status === 'UPLOADING' ? 'Tải lại file' : 'Nộp lại'}</Button>}
      </Space> : student && row.status === 'PUBLISHED' ? <Button size="small" onClick={() => startSubmission(row)}>Nộp bài</Button> : '-',
    },
    {
      title: 'Thao tác',
      render: (_, row) => manage ? <Space>
        {row.status === 'DRAFT' && <Button size="small" onClick={async () => { const result = await publishHomeworkApi(row._id); if (result?.EC === 0) { message.success(result.EM); loadHomeworks(); } else message.error(result?.EM); }}>Mở bài</Button>}
        {row.status === 'PUBLISHED' && <Button size="small" onClick={async () => { const result = await closeHomeworkApi(row._id); if (result?.EC === 0) { message.success(result.EM); loadHomeworks(); } else message.error(result?.EM); }}>Đóng bài</Button>}
        {(grade || isTeacher) && row.status !== 'DRAFT' && <Button size="small" onClick={() => openSubmissions(row)}>Bài nộp</Button>}
      </Space> : '-',
    },
  ];

  return <Space direction="vertical" style={{ width: '100%' }} size="large">
    <Card title="Bài tập" extra={manage && <Button type="primary" onClick={() => { form.resetFields(); setOpen(true); }}>{createTitle}</Button>}>
      <Table rowKey="_id" dataSource={rows} columns={columns} />
    </Card>

    {seeRetakes && <Card title="Yêu cầu thi lại / học lại" extra={student && <Button type="primary" onClick={() => { retakeForm.resetFields(); retakeForm.setFieldsValue({ requestType: 'RETAKE_EXAM' }); setRetakeOpen(true); }}>Tạo yêu cầu</Button>}>
      <Table rowKey="_id" dataSource={retakes} columns={[
        { title: 'Loại yêu cầu', dataIndex: 'requestType', render: value => requestTypeLabels[value] || requestTypeLabels.RETAKE_EXAM },
        { title: 'Học sinh', render: (_, row) => row.studentId?.name },
        { title: 'Môn', render: (_, row) => row.subjectId?.name },
        { title: 'Năm học', render: (_, row) => row.academicYearId?.name },
        { title: 'Lý do', dataIndex: 'reason' },
        { title: 'Trạng thái', dataIndex: 'status', render: value => <Tag>{enumLabel(value)}</Tag> },
        { title: 'Xử lý', render: (_, row) => reviewRetake && row.status === 'REQUESTED' ? <Space><Button size="small" onClick={() => reviewRequest(row, 'APPROVED')}>Duyệt</Button><Button size="small" danger onClick={() => reviewRequest(row, 'REJECTED')}>Từ chối</Button></Space> : '-' },
      ]} />
    </Card>}

    <AssignmentDialogs open={open} createTitle={createTitle} setOpen={setOpen} form={form} classes={classes} subjects={subjects} years={years} teachers={teachers} isTeacher={isTeacher} loadHomeworks={loadHomeworks} submitTarget={submitTarget} setSubmitTarget={setSubmitTarget} submitFile={submitFile} setSubmitFile={setSubmitFile} submitForm={submitForm} submissionMode={submissionMode} gradeTarget={gradeTarget} setGradeTarget={setGradeTarget} submissions={submissions} setSubmissions={setSubmissions} gradeForm={gradeForm} retakeOpen={retakeOpen} setRetakeOpen={setRetakeOpen} retakeForm={retakeForm} loadRetakes={loadRetakes} formatDate={formatDate} modeLabels={modeLabels} requestTypeLabels={requestTypeLabels} />
  </Space>;
}
