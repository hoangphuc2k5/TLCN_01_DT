import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Modal, Radio, Select, Space, Table, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import {
  closeHomeworkApi, createHomeworkApi, createRetakeRequestApi, downloadHomeworkAttachmentApi,
  getAcademicYearsApi, getClassesApi, getHomeworkSubmissionsApi, getHomeworksApi,
  getRetakeRequestsApi, getSubjectsApi, gradeHomeworkApi, publishHomeworkApi,
  reviewRetakeRequestApi, submitHomeworkApi, uploadHomeworkAttachmentApi,
} from '../../api';
import { ROLES } from '../../constants/roles';
import { can } from '../../util/permissions';

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

  const loadHomeworks = async () => {
    const result = await getHomeworksApi();
    if (result?.EC === 0) setRows(result.data || []);
  };
  const loadRetakes = async () => {
    if (!seeRetakes) return;
    const result = await getRetakeRequestsApi();
    if (result?.EC === 0) setRetakes(result.data || []);
  };

  useEffect(() => {
    (async () => {
      const requests = [];
      if (manage) requests.push(getClassesApi().then(result => setClasses(result?.data || [])));
      if (manage || seeRetakes) {
        requests.push(getSubjectsApi().then(result => setSubjects(result?.data || [])));
        requests.push(getAcademicYearsApi().then(result => setYears(result?.data || [])));
      }
      await Promise.all(requests);
      await Promise.all([loadHomeworks(), loadRetakes()]);
    })();
  }, []);

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
    { title: 'Trạng thái', dataIndex: 'status', render: value => <Tag color={value === 'PUBLISHED' ? 'green' : value === 'CLOSED' ? 'default' : 'gold'}>{value}</Tag> },
    {
      title: 'Bài của em',
      render: (_, row) => row.submission ? <Space direction="vertical" size={2}>
        <span>{row.submission.status === 'UPLOADING' ? 'Chờ tải file' : row.submission.score == null ? 'Đã nộp' : `${row.submission.score}/${row.maxScore}`}</span>
        <Tag>{modeLabels[row.submission.submissionMode] || row.submission.submissionMode}</Tag>
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
        { title: 'Trạng thái', dataIndex: 'status', render: value => <Tag>{value}</Tag> },
        { title: 'Xử lý', render: (_, row) => reviewRetake && row.status === 'REQUESTED' ? <Space><Button size="small" onClick={() => reviewRequest(row, 'APPROVED')}>Duyệt</Button><Button size="small" danger onClick={() => reviewRequest(row, 'REJECTED')}>Từ chối</Button></Space> : '-' },
      ]} />
    </Card>}

    <Modal open={open} title={createTitle} onCancel={() => setOpen(false)} onOk={() => form.submit()} width={640}>
      <Form form={form} layout="vertical" onFinish={async values => { const result = await createHomeworkApi({ ...values, dueAt: new Date(values.dueAt).toISOString(), availableFrom: values.availableFrom ? new Date(values.availableFrom).toISOString() : undefined }); if (result?.EC === 0) { message.success(result.EM); setOpen(false); loadHomeworks(); } else message.error(result?.EM); }}>
        <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}><Input maxLength={200} /></Form.Item>
        <Form.Item name="instructions" label="Đề bài / hướng dẫn"><Input.TextArea rows={5} maxLength={10000} /></Form.Item>
        <Form.Item name="classId" label="Lớp" rules={[{ required: true }]}><Select options={classes.map(item => ({ value: item._id, label: item.name }))} /></Form.Item>
        <Form.Item name="subjectId" label="Môn" rules={[{ required: true }]}><Select options={subjects.map(item => ({ value: item._id, label: item.name }))} /></Form.Item>
        <Form.Item name="academicYearId" label="Năm học" rules={[{ required: true }]}><Select options={years.map(item => ({ value: item._id, label: item.name }))} /></Form.Item>
        {!isTeacher && <Form.Item name="teacherId" label="ID giáo viên" rules={[{ required: true }]}><Input /></Form.Item>}
        <Form.Item name="dueAt" label="Hạn nộp" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item>
        <Form.Item name="maxScore" label="Điểm tối đa" initialValue={10} rules={[{ required: true }]}><InputNumber min={0.1} max={100} /></Form.Item>
        <Form.Item name="allowLate" label="Cho phép nộp trễ" valuePropName="checked"><input type="checkbox" /></Form.Item>
        <Form.Item name="lateUntil" label="Hạn cuối nộp trễ"><Input type="datetime-local" /></Form.Item>
      </Form>
    </Modal>

    <Modal open={!!submitTarget} title={`Nộp bài: ${submitTarget?.title || ''}`} onCancel={() => { setSubmitTarget(null); setSubmitFile(null); }} onOk={() => submitForm.submit()}>
      <Form form={submitForm} layout="vertical" initialValues={{ submissionMode: 'WEB' }} onFinish={async values => {
        if (values.submissionMode === 'FILE' && !submitFile) return message.error('Hãy chọn file bài làm');
        const result = await submitHomeworkApi(submitTarget._id, values);
        if (result?.EC !== 0) return message.error(result?.EM);
        if (values.submissionMode === 'FILE') {
          const uploaded = await uploadHomeworkAttachmentApi(submitTarget._id, submitFile);
          if (uploaded?.EC !== 0) {
            message.error(`Chưa hoàn tất nộp bài: ${uploaded?.EM || 'Không tải được file'}`);
            await loadHomeworks();
            return;
          }
        }
        message.success(values.submissionMode === 'FILE' ? 'Đã nộp file bài làm' : 'Đã nộp bài trực tuyến');
        setSubmitTarget(null);
        setSubmitFile(null);
        loadHomeworks();
      }}>
        <Form.Item name="submissionMode" label="Hình thức nộp" rules={[{ required: true }]}>
          <Radio.Group options={[{ value: 'WEB', label: 'Làm trực tuyến' }, { value: 'FILE', label: 'Nộp file' }]} />
        </Form.Item>
        <Form.Item name="answerText" label={submissionMode === 'WEB' ? 'Nội dung bài làm' : 'Ghi chú'} rules={submissionMode === 'WEB' ? [{ required: true, whitespace: true }] : []}>
          <Input.TextArea rows={submissionMode === 'WEB' ? 10 : 4} maxLength={20000} showCount />
        </Form.Item>
        {submissionMode === 'FILE' && <Form.Item label="File bài làm" required>
          <input aria-label="File bài làm" type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.docx,.xlsx,.pptx" onChange={event => setSubmitFile(event.target.files?.[0] || null)} />
        </Form.Item>}
      </Form>
    </Modal>

    <Modal open={!!gradeTarget} title={`Bài nộp: ${gradeTarget?.title || ''}`} onCancel={() => setGradeTarget(null)} footer={null} width={920}>
      <Table size="small" rowKey="_id" dataSource={submissions} columns={[
        { title: 'Học sinh', render: (_, row) => row.studentId?.name || '' },
        { title: 'Hình thức', dataIndex: 'submissionMode', render: value => modeLabels[value] || value },
        { title: 'Nội dung', dataIndex: 'answerText', ellipsis: true },
        { title: 'File', render: (_, row) => <Space direction="vertical">{(row.attachmentIds || []).map(file => <Button type="link" size="small" key={file._id} onClick={() => downloadHomeworkAttachmentApi(file._id, file.originalName)}>{file.originalName}</Button>)}</Space> },
        { title: 'Thời gian nộp', dataIndex: 'submittedAt', render: formatDate },
        { title: 'Trễ', dataIndex: 'late', render: value => value ? 'Có' : 'Không' },
        { title: 'Điểm', dataIndex: 'score', render: value => value == null ? 'Chưa chấm' : value },
        { title: 'Chấm', render: (_, row) => row.status === 'SUBMITTED' ? <Button size="small" onClick={() => { gradeForm.resetFields(); gradeForm.setFieldsValue({ submissionId: row._id }); }}>Chấm bài</Button> : 'Đã chấm' },
      ]} />
      <Form form={gradeForm} layout="inline" onFinish={async values => { const result = await gradeHomeworkApi(values.submissionId, values); if (result?.EC === 0) { const refreshed = await getHomeworkSubmissionsApi(gradeTarget._id); setSubmissions(refreshed.data || []); gradeForm.resetFields(); message.success(result.EM); } else message.error(result?.EM); }} style={{ marginTop: 16 }}>
        <Form.Item name="submissionId" hidden><Input /></Form.Item>
        <Form.Item name="score" label="Điểm" rules={[{ required: true }]}><InputNumber min={0} max={gradeTarget?.maxScore} /></Form.Item>
        <Form.Item name="feedback" label="Nhận xét"><Input style={{ width: 300 }} maxLength={10000} /></Form.Item>
        <Button htmlType="submit" type="primary">Lưu</Button>
      </Form>
    </Modal>

    <Modal open={retakeOpen} title="Yêu cầu thi lại / học lại" onCancel={() => setRetakeOpen(false)} onOk={() => retakeForm.submit()}>
      <Form form={retakeForm} layout="vertical" onFinish={async values => { const result = await createRetakeRequestApi(values); if (result?.EC === 0) { message.success(result.EM); setRetakeOpen(false); retakeForm.resetFields(); loadRetakes(); } else message.error(result?.EM); }}>
        <Form.Item name="requestType" label="Loại yêu cầu" rules={[{ required: true }]}><Select options={Object.entries(requestTypeLabels).map(([value, label]) => ({ value, label }))} /></Form.Item>
        <Form.Item name="subjectId" label="Môn" rules={[{ required: true }]}><Select options={subjects.map(item => ({ value: item._id, label: item.name }))} /></Form.Item>
        <Form.Item name="academicYearId" label="Năm học" rules={[{ required: true }]}><Select options={years.map(item => ({ value: item._id, label: item.name }))} /></Form.Item>
        <Form.Item name="reason" label="Lý do" rules={[{ required: true, whitespace: true }]}><Input.TextArea maxLength={2000} showCount /></Form.Item>
      </Form>
    </Modal>
  </Space>;
}
