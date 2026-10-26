import { useEffect, useState } from 'react';
import { Button, Form, Space, Table, Tabs } from 'antd';
import {
  getAcademicYearsApi,
  getAssignmentsApi,
  getClassesApi,
  getSubjectsApi,
  getUserDirectoryApi,
} from '../../services/api.service';
import { useSelector } from 'react-redux';
import { can } from '../../utils/permissions';
import { ROLES } from '../../constants/roles';
import ClassAdminDialogs from './ClassAdminDialogs';

const ClassesPage = () => {
  const { user } = useSelector(s => s.auth);
  const canCreate = can(user, 'classes', 'create');
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
      getUserDirectoryApi({ role: ROLES.SUBJECT_TEACHER }),
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
                  {canCreate && <Button type="primary" onClick={() => setOpenClass(true)}>
                    Thêm lớp
                  </Button>}
                  {canCreate && <Button onClick={() => setOpenYear(true)}>Thêm năm học</Button>}
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
                {canCreate && <Button
                  type="primary"
                  style={{ marginBottom: 16 }}
                  onClick={() => setOpenSubject(true)}
                >
                  Thêm môn
                </Button>}
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
                {canCreate && <Button
                  type="primary"
                  style={{ marginBottom: 16 }}
                  onClick={() => setOpenAssign(true)}
                >
                  Phân công
                </Button>}
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

      <ClassAdminDialogs openClass={openClass} setOpenClass={setOpenClass} classForm={classForm} years={years} load={load} openSubject={openSubject} setOpenSubject={setOpenSubject} subjectForm={subjectForm} openAssign={openAssign} setOpenAssign={setOpenAssign} assignForm={assignForm} teachers={teachers} classes={classes} subjects={subjects} openYear={openYear} setOpenYear={setOpenYear} yearForm={yearForm} />
    </div>
  );
};

export default ClassesPage;
