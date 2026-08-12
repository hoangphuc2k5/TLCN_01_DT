import { useEffect, useState } from 'react';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  message,
} from 'antd';
import {
  createAcademicYearApi,
  createAssignmentApi,
  createClassApi,
  createSubjectApi,
  getAcademicYearsApi,
  getAssignmentsApi,
  getClassesApi,
  getSubjectsApi,
  getUsersApi,
} from '../../api';
import { ROLES } from '../../constants/roles';

const ClassesPage = () => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [years, setYears] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [openClass, setOpenClass] = useState(false);
  const [openSubject, setOpenSubject] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [openYear, setOpenYear] = useState(false);
  const [classForm] = Form.useForm();
  const [subjectForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [yearForm] = Form.useForm();

  const load = async () => {
    const [c, s, y, a, u] = await Promise.all([
      getClassesApi(),
      getSubjectsApi(),
      getAcademicYearsApi(),
      getAssignmentsApi(),
      getUsersApi({ role: ROLES.SUBJECT_TEACHER }),
    ]);
    if (c?.EC === 0) setClasses(c.data || []);
    if (s?.EC === 0) setSubjects(s.data || []);
    if (y?.EC === 0) setYears(y.data || []);
    if (a?.EC === 0) setAssignments(a.data || []);
    if (u?.EC === 0) setTeachers(u.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <Tabs
        items={[
          {
            key: 'classes',
            label: 'Lớp học',
            children: (
              <>
                <Space style={{ marginBottom: 16 }}>
                  <Button type="primary" onClick={() => setOpenClass(true)}>
                    Thêm lớp
                  </Button>
                  <Button onClick={() => setOpenYear(true)}>Thêm năm học</Button>
                </Space>
                <Table
                  rowKey="_id"
                  dataSource={classes}
                  columns={[
                    { title: 'Tên lớp', dataIndex: 'name' },
                    { title: 'Khối', dataIndex: 'gradeLevel' },
                    { title: 'Phòng', dataIndex: 'room' },
                    {
                      title: 'GVCN',
                      render: (_, r) => r.homeroomTeacherId?.name || '—',
                    },
                    {
                      title: 'Năm học',
                      render: (_, r) => r.academicYearId?.name || '—',
                    },
                  ]}
                />
              </>
            ),
          },
          {
            key: 'subjects',
            label: 'Môn học',
            children: (
              <>
                <Button
                  type="primary"
                  style={{ marginBottom: 16 }}
                  onClick={() => setOpenSubject(true)}
                >
                  Thêm môn
                </Button>
                <Table
                  rowKey="_id"
                  dataSource={subjects}
                  columns={[
                    { title: 'Mã', dataIndex: 'code' },
                    { title: 'Tên môn', dataIndex: 'name' },
                    {
                      title: 'Khối áp dụng',
                      dataIndex: 'gradeLevels',
                      render: (v) => (v || []).join(', '),
                    },
                  ]}
                />
              </>
            ),
          },
          {
            key: 'assignments',
            label: 'Phân công giảng dạy',
            children: (
              <>
                <Button
                  type="primary"
                  style={{ marginBottom: 16 }}
                  onClick={() => setOpenAssign(true)}
                >
                  Phân công
                </Button>
                <Table
                  rowKey="_id"
                  dataSource={assignments}
                  columns={[
                    { title: 'Giáo viên', render: (_, r) => r.teacherId?.name },
                    { title: 'Lớp', render: (_, r) => r.classId?.name },
                    { title: 'Môn', render: (_, r) => r.subjectId?.name },
                    { title: 'Năm học', render: (_, r) => r.academicYearId?.name },
                  ]}
                />
              </>
            ),
          },
        ]}
      />

      <Modal open={openClass} title="Thêm lớp" onCancel={() => setOpenClass(false)} onOk={() => classForm.submit()}>
        <Form
          form={classForm}
          layout="vertical"
          onFinish={async (v) => {
            const res = await createClassApi(v);
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpenClass(false);
              classForm.resetFields();
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="name" label="Tên lớp" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="gradeLevel" label="Khối" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={1} max={12} />
          </Form.Item>
          <Form.Item name="academicYearId" label="Năm học" rules={[{ required: true }]}>
            <Select options={years.map((y) => ({ value: y._id, label: y.name }))} />
          </Form.Item>
          <Form.Item name="room" label="Phòng">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={openSubject} title="Thêm môn" onCancel={() => setOpenSubject(false)} onOk={() => subjectForm.submit()}>
        <Form
          form={subjectForm}
          layout="vertical"
          onFinish={async (v) => {
            const res = await createSubjectApi(v);
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpenSubject(false);
              subjectForm.resetFields();
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="code" label="Mã môn" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Tên môn" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={openAssign} title="Phân công" onCancel={() => setOpenAssign(false)} onOk={() => assignForm.submit()}>
        <Form
          form={assignForm}
          layout="vertical"
          onFinish={async (v) => {
            const res = await createAssignmentApi(v);
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpenAssign(false);
              assignForm.resetFields();
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="teacherId" label="Giáo viên" rules={[{ required: true }]}>
            <Select options={teachers.map((t) => ({ value: t._id, label: t.name }))} />
          </Form.Item>
          <Form.Item name="classId" label="Lớp" rules={[{ required: true }]}>
            <Select options={classes.map((c) => ({ value: c._id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="subjectId" label="Môn" rules={[{ required: true }]}>
            <Select options={subjects.map((s) => ({ value: s._id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="academicYearId" label="Năm học" rules={[{ required: true }]}>
            <Select options={years.map((y) => ({ value: y._id, label: y.name }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={openYear} title="Thêm năm học" onCancel={() => setOpenYear(false)} onOk={() => yearForm.submit()}>
        <Form
          form={yearForm}
          layout="vertical"
          onFinish={async (v) => {
            const res = await createAcademicYearApi({ ...v, isCurrent: true });
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpenYear(false);
              yearForm.resetFields();
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="name" label="Tên năm học" rules={[{ required: true }]}>
            <Input placeholder="2025-2026" />
          </Form.Item>
          <Form.Item name="startDate" label="Ngày bắt đầu" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="endDate" label="Ngày kết thúc" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClassesPage;
