import { useEffect, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import {
  createLessonPlanApi, deleteLessonPlanApi, getAcademicYearsApi, getClassesApi, getLessonPlansApi,
  getSubjectsApi, reviewLessonPlanApi, submitLessonPlanApi, updateLessonPlanApi,
} from '../../api';
import { can, sameId } from '../../util/permissions';

const statusColor = { DRAFT: 'default', SUBMITTED: 'processing', APPROVED: 'success', REJECTED: 'error' };

export default function LessonPlansPage() {
  const { user } = useSelector(state => state.auth);
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [form] = Form.useForm();
  const [reviewForm] = Form.useForm();
  const canCreate = can(user, 'lesson_plans', 'create');
  const canReview = can(user, 'lesson_plans', 'execute');

  const load = async () => {
    setLoading(true);
    try {
      const result = await getLessonPlansApi();
      if (result?.EC === 0) setRows(result.data || []);
      else message.error(result?.EM || 'Không tải được giáo án');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    (async () => {
      const [classResult, subjectResult, yearResult] = await Promise.all([getClassesApi(), getSubjectsApi(), getAcademicYearsApi()]);
      setClasses(classResult?.data || []);
      setSubjects(subjectResult?.data || []);
      setYears(yearResult?.data || []);
      await load();
    })();
  }, []);

  const openEditor = row => {
    setEditing(row || {});
    form.resetFields();
    form.setFieldsValue(row ? {
      ...row,
      classId: row.classId?._id || row.classId,
      subjectId: row.subjectId?._id || row.subjectId,
      academicYearId: row.academicYearId?._id || row.academicYearId,
      lessonDate: row.lessonDate ? dayjs(row.lessonDate).format('YYYY-MM-DD') : undefined,
    } : { durationMinutes: 45, activities: [{ durationMinutes: 15 }] });
  };

  const save = async values => {
    setSaving(true);
    try {
      const data = { ...values, lessonDate: values.lessonDate ? new Date(`${values.lessonDate}T00:00:00`).toISOString() : null };
      const result = editing?._id ? await updateLessonPlanApi(editing._id, data) : await createLessonPlanApi(data);
      if (result?.EC !== 0) return message.error(result?.EM || 'Không lưu được giáo án');
      message.success(result.EM);
      setEditing(null);
      await load();
    } finally { setSaving(false); }
  };

  const act = async (request, successText) => {
    const result = await request();
    if (result?.EC !== 0) return message.error(result?.EM || 'Thao tác thất bại');
    message.success(result.EM || successText);
    await load();
  };

  const columns = [
    { title: 'Giáo án', dataIndex: 'title' },
    { title: 'Giáo viên', render: (_, row) => row.teacherId?.name || '-' },
    { title: 'Lớp', render: (_, row) => row.classId?.name || '-' },
    { title: 'Môn', render: (_, row) => row.subjectId?.name || '-' },
    { title: 'Ngày dạy', dataIndex: 'lessonDate', render: value => value ? dayjs(value).format('DD/MM/YYYY') : '-' },
    { title: 'Lần gửi', dataIndex: 'revision' },
    { title: 'Trạng thái', dataIndex: 'status', render: value => <Tag color={statusColor[value]}>{value}</Tag> },
    { title: 'Phản hồi', dataIndex: 'reviewNote', ellipsis: true, render: value => value || '-' },
    {
      title: 'Thao tác',
      render: (_, row) => {
        const own = sameId(row.teacherId, user?._id);
        const editable = own && ['DRAFT', 'REJECTED'].includes(row.status);
        return <Space wrap>
          {editable && can(user, 'lesson_plans', 'update') && <Button size="small" onClick={() => openEditor(row)}>Sửa</Button>}
          {editable && can(user, 'lesson_plans', 'update') && <Button size="small" type="primary" onClick={() => act(() => submitLessonPlanApi(row._id), 'Đã gửi duyệt')}>Gửi duyệt</Button>}
          {editable && can(user, 'lesson_plans', 'delete') && <Popconfirm title="Xóa giáo án này?" onConfirm={() => act(() => deleteLessonPlanApi(row._id), 'Đã xóa')}><Button size="small" danger>Xóa</Button></Popconfirm>}
          {canReview && row.status === 'SUBMITTED' && <>
            <Button size="small" type="primary" onClick={() => { setReviewing({ row, status: 'APPROVED' }); reviewForm.setFieldsValue({ reviewNote: '' }); }}>Duyệt</Button>
            <Button size="small" danger onClick={() => { setReviewing({ row, status: 'REJECTED' }); reviewForm.setFieldsValue({ reviewNote: '' }); }}>Từ chối</Button>
          </>}
        </Space>;
      },
    },
  ];

  return <div>
    <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
      <div><Typography.Title level={3} style={{ margin: 0 }}>Giáo án</Typography.Title><Typography.Text type="secondary">Soạn, gửi và theo dõi phê duyệt giáo án theo từng lần chỉnh sửa.</Typography.Text></div>
      {canCreate && <Button type="primary" onClick={() => openEditor(null)}>Soạn giáo án</Button>}
    </Space>
    <Table
      rowKey="_id" loading={loading} dataSource={rows} columns={columns}
      expandable={{ expandedRowRender: row => <div>
        <Typography.Paragraph><strong>Mục tiêu:</strong> {row.objectives || '-'}</Typography.Paragraph>
        <Typography.Paragraph><strong>Chuẩn bị:</strong> {row.preparation || '-'}</Typography.Paragraph>
        <Typography.Paragraph><strong>Nội dung:</strong> {row.content || '-'}</Typography.Paragraph>
        <Table pagination={false} size="small" rowKey={(_, index) => index} dataSource={row.activities || []} columns={[
          { title: 'Hoạt động', dataIndex: 'title' }, { title: 'Phút', dataIndex: 'durationMinutes' },
          { title: 'Giáo viên', dataIndex: 'teacherActivities' }, { title: 'Học sinh', dataIndex: 'studentActivities' },
          { title: 'Đánh giá', dataIndex: 'assessment' },
        ]} />
      </div> }}
    />

    <Modal open={!!editing} title={editing?._id ? 'Sửa giáo án' : 'Soạn giáo án'} onCancel={() => setEditing(null)} onOk={() => form.submit()} confirmLoading={saving} width={820} destroyOnClose>
      <Form form={form} layout="vertical" onFinish={save}>
        <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, whitespace: true }]}><Input maxLength={200} /></Form.Item>
        <Space align="start" wrap>
          <Form.Item name="classId" label="Lớp" rules={[{ required: true }]}><Select style={{ width: 180 }} options={classes.map(item => ({ value: item._id, label: item.name }))} /></Form.Item>
          <Form.Item name="subjectId" label="Môn" rules={[{ required: true }]}><Select style={{ width: 180 }} options={subjects.map(item => ({ value: item._id, label: item.name }))} /></Form.Item>
          <Form.Item name="academicYearId" label="Năm học" rules={[{ required: true }]}><Select style={{ width: 180 }} options={years.map(item => ({ value: item._id, label: item.name }))} /></Form.Item>
          <Form.Item name="lessonDate" label="Ngày dạy"><Input type="date" /></Form.Item>
          <Form.Item name="durationMinutes" label="Thời lượng (phút)" rules={[{ required: true }]}><InputNumber min={1} max={300} /></Form.Item>
        </Space>
        <Form.Item name="objectives" label="Mục tiêu" rules={[{ required: true, whitespace: true }]}><Input.TextArea rows={3} maxLength={5000} showCount /></Form.Item>
        <Form.Item name="preparation" label="Chuẩn bị"><Input.TextArea rows={2} maxLength={5000} /></Form.Item>
        <Form.Item name="content" label="Nội dung trọng tâm" rules={[{ required: true, whitespace: true }]}><Input.TextArea rows={5} maxLength={20000} showCount /></Form.Item>
        <Form.List name="activities">
          {(fields, { add, remove }) => <>
            <Space style={{ marginBottom: 8 }}><Typography.Text strong>Hoạt động dạy học</Typography.Text><Button size="small" onClick={() => add({ durationMinutes: 10 })}>Thêm hoạt động</Button></Space>
            {fields.map(({ key, name, ...rest }) => <div key={key} style={{ border: '1px solid #eee', padding: 12, marginBottom: 12, borderRadius: 8 }}>
              <Space align="start" wrap>
                <Form.Item {...rest} name={[name, 'title']} label="Tên hoạt động" rules={[{ required: true, whitespace: true }]}><Input style={{ width: 300 }} maxLength={200} /></Form.Item>
                <Form.Item {...rest} name={[name, 'durationMinutes']} label="Phút" rules={[{ required: true }]}><InputNumber min={1} max={240} /></Form.Item>
                <Button danger type="text" onClick={() => remove(name)}>Xóa</Button>
              </Space>
              <Form.Item {...rest} name={[name, 'teacherActivities']} label="Hoạt động của giáo viên"><Input.TextArea rows={2} maxLength={5000} /></Form.Item>
              <Form.Item {...rest} name={[name, 'studentActivities']} label="Hoạt động của học sinh"><Input.TextArea rows={2} maxLength={5000} /></Form.Item>
              <Form.Item {...rest} name={[name, 'assessment']} label="Cách đánh giá"><Input.TextArea rows={2} maxLength={2000} /></Form.Item>
            </div>)}
          </>}
        </Form.List>
      </Form>
    </Modal>

    <Modal open={!!reviewing} title={reviewing?.status === 'APPROVED' ? 'Duyệt giáo án' : 'Từ chối giáo án'} onCancel={() => setReviewing(null)} onOk={() => reviewForm.submit()}>
      <Form form={reviewForm} layout="vertical" onFinish={async values => {
        const result = await reviewLessonPlanApi(reviewing.row._id, { status: reviewing.status, reviewNote: values.reviewNote });
        if (result?.EC !== 0) return message.error(result?.EM || 'Không xử lý được giáo án');
        message.success(result.EM); setReviewing(null); await load();
      }}>
        <Form.Item name="reviewNote" label="Nhận xét" rules={reviewing?.status === 'REJECTED' ? [{ required: true, whitespace: true }] : []}><Input.TextArea rows={4} maxLength={5000} /></Form.Item>
      </Form>
    </Modal>
  </div>;
}
