import { useEffect, useState } from 'react';
import { Button, Form, InputNumber, Modal, Select, Space, Table, message } from 'antd';
import { useSelector } from 'react-redux';
import {
  getAcademicYearsApi,
  getClassesApi,
  getClassStudentsApi,
  getGradesApi,
  getSubjectsApi,
  upsertGradeApi,
  downloadExport,
} from '../../services/api.service';
import ImportExcelButton from '../../components/ImportExcelButton';
import { can, canExport } from '../../utils/permissions';

const GradesPage = () => {
  const { user } = useSelector((s) => s.auth);
  const canEnter = can(user, 'grades', 'create') && can(user, 'grades', 'update');
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [years, setYears] = useState([]);
  const [students, setStudents] = useState([]);
  const [filterClass, setFilterClass] = useState(null);
  const [filterSubject, setFilterSubject] = useState(null);
  const [filterSemester, setFilterSemester] = useState(null);
  const [form] = Form.useForm();

  const load = async () => {
    const res = await getGradesApi();
    if (res?.EC === 0) setRows(res.data || []);
  };

  useEffect(() => {
    (async () => {
      const [c, s, y] = await Promise.all([
        getClassesApi(),
        getSubjectsApi(),
        getAcademicYearsApi(),
      ]);
      if (c?.EC === 0) setClasses(c.data || []);
      if (s?.EC === 0) setSubjects(s.data || []);
      if (y?.EC === 0) setYears(y.data || []);
      load();
    })();
  }, []);

  const displayRows = rows.filter((r) => {
    if (filterClass && (r.classId?._id || r.classId) !== filterClass) return false;
    if (filterSubject && (r.subjectId?._id || r.subjectId) !== filterSubject) return false;
    if (filterSemester && r.semester !== filterSemester) return false;
    return true;
  });

  const getClassificationTag = (cls) => {
    if (!cls) return '—';
    if (['GIỎI', 'XUẤT SẮC', 'GIOI', 'EXCELLENT'].includes(String(cls).toUpperCase())) return <span style={{ color: '#2e7d32', fontWeight: 600 }}>{cls}</span>;
    if (['KHÁ', 'KHA', 'GOOD'].includes(String(cls).toUpperCase())) return <span style={{ color: '#1565c0', fontWeight: 600 }}>{cls}</span>;
    if (['TRUNG BÌNH', 'TB', 'AVERAGE'].includes(String(cls).toUpperCase())) return <span style={{ color: '#e65100', fontWeight: 600 }}>{cls}</span>;
    return <span style={{ color: '#c62828', fontWeight: 600 }}>{cls}</span>;
  };

  return (
    <div>
      {(canEnter || canExport(user, 'grades')) && (
        <Space style={{ marginBottom: 16 }} wrap>
          {canEnter && <Button type="primary" onClick={() => setOpen(true)}>
            Nhập / cập nhật điểm
          </Button>}
          {canEnter && <ImportExcelButton type="grades" onDone={load} />}
          {canExport(user, 'grades') && <Button
            onClick={async () => {
              try {
                await downloadExport('grades');
              } catch {
                message.error('Xuất Excel thất bại');
              }
            }}
          >
            Xuất Excel
          </Button>}
        </Space>
      )}

      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="Lọc theo Lớp"
          style={{ width: 160 }}
          value={filterClass}
          onChange={setFilterClass}
          options={classes.map((c) => ({ value: c._id, label: c.name }))}
        />
        <Select
          allowClear
          placeholder="Lọc theo Môn"
          style={{ width: 160 }}
          value={filterSubject}
          onChange={setFilterSubject}
          options={subjects.map((s) => ({ value: s._id, label: s.name }))}
        />
        <Select
          allowClear
          placeholder="Lọc theo Học kỳ"
          style={{ width: 140 }}
          value={filterSemester}
          onChange={setFilterSemester}
          options={[
            { value: 1, label: 'Học kỳ 1' },
            { value: 2, label: 'Học kỳ 2' },
          ]}
        />
        {(filterClass || filterSubject || filterSemester) && (
          <Button onClick={() => { setFilterClass(null); setFilterSubject(null); setFilterSemester(null); }}>
            Xóa bộ lọc
          </Button>
        )}
      </Space>

      <Table
        rowKey="_id"
        dataSource={displayRows}
        columns={[
          { title: 'Học sinh', render: (_, r) => r.studentId?.name },
          { title: 'Lớp', render: (_, r) => r.classId?.name },
          { title: 'Môn', render: (_, r) => r.subjectId?.name },
          { title: 'HK', dataIndex: 'semester' },
          { title: 'ĐTB', dataIndex: 'average' },
          { title: 'Xếp loại', dataIndex: 'classification', render: (v) => getClassificationTag(v) },
          {
            title: 'Chi tiết',
            render: (_, r) =>
              (r.scores || []).map((s) => `${s.type}:${s.score}`).join(' | '),
          },
        ]}
      />
      <Modal
        open={open}
        title="Nhập điểm"
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        width={640}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            const scores = [
              { type: 'ORAL', score: v.oral, weight: 1 },
              { type: 'QUIZ_15', score: v.quiz, weight: 1 },
              { type: 'MIDTERM', score: v.midterm, weight: 2 },
              { type: 'FINAL', score: v.final, weight: 3 },
            ].filter((s) => s.score != null);
            const res = await upsertGradeApi({
              academicYearId: v.academicYearId,
              classId: v.classId,
              subjectId: v.subjectId,
              studentId: v.studentId,
              semester: v.semester || 1,
              scores,
              strategy: 'weighted',
            });
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpen(false);
              form.resetFields();
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="academicYearId" label="Năm học" rules={[{ required: true }]}>
            <Select options={years.map((y) => ({ value: y._id, label: y.name }))} />
          </Form.Item>
          <Form.Item name="classId" label="Lớp" rules={[{ required: true }]}>
            <Select
              options={classes.map((c) => ({ value: c._id, label: c.name }))}
              onChange={async (id) => {
                form.setFieldValue('studentId', undefined);
                setStudents([]);
                const res = await getClassStudentsApi(id);
                if (res?.EC === 0) setStudents(res.data || []);
              }}
            />
          </Form.Item>
          <Form.Item name="studentId" label="Học sinh" rules={[{ required: true }]}>
            <Select options={students.map((s) => ({ value: s._id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="subjectId" label="Môn" rules={[{ required: true }]}>
            <Select options={subjects.map((s) => ({ value: s._id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="semester" label="Học kỳ" initialValue={1}>
            <Select
              options={[
                { value: 1, label: 'HK1' },
                { value: 2, label: 'HK2' },
              ]}
            />
          </Form.Item>
          <Space wrap>
            <Form.Item name="oral" label="Miệng">
              <InputNumber min={0} max={10} step={0.1} />
            </Form.Item>
            <Form.Item name="quiz" label="15 phút">
              <InputNumber min={0} max={10} step={0.1} />
            </Form.Item>
            <Form.Item name="midterm" label="Giữa kỳ">
              <InputNumber min={0} max={10} step={0.1} />
            </Form.Item>
            <Form.Item name="final" label="Cuối kỳ">
              <InputNumber min={0} max={10} step={0.1} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default GradesPage;
