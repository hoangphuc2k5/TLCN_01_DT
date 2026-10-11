import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Form, InputNumber, Modal, Row, Select, Space, Statistic, Table, Tabs, Tag, message } from 'antd';
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
  const [summaryClassId, setSummaryClassId] = useState(null);
  const [summarySemester, setSummarySemester] = useState(1);
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
      if (c?.EC === 0) {
        setClasses(c.data || []);
        if (c.data?.length > 0) setSummaryClassId(c.data[0]._id);
      }
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
    const upper = String(cls).toUpperCase();
    if (['GIỎI', 'XUẤT SẮC', 'GIOI', 'EXCELLENT'].includes(upper)) {
      return <Tag color="green">{cls}</Tag>;
    }
    if (['KHÁ', 'KHA', 'GOOD'].includes(upper)) {
      return <Tag color="blue">{cls}</Tag>;
    }
    if (['TRUNG BÌNH', 'TB', 'AVERAGE'].includes(upper)) {
      return <Tag color="orange">{cls}</Tag>;
    }
    return <Tag color="red">{cls}</Tag>;
  };

  const summaryData = useMemo(() => {
    if (!summaryClassId) return { students: [], subjects: [], stats: { excellent: 0, good: 0, average: 0, weak: 0 } };
    const classGrades = rows.filter(
      (r) => (r.classId?._id || r.classId) === summaryClassId && r.semester === summarySemester
    );
    const subMap = new Map();
    classGrades.forEach((g) => {
      const sId = g.subjectId?._id || g.subjectId;
      const sName = g.subjectId?.name || 'Môn';
      if (sId && !subMap.has(String(sId))) subMap.set(String(sId), { id: sId, name: sName });
    });
    const subList = [...subMap.values()];

    const stuMap = new Map();
    classGrades.forEach((g) => {
      const stId = g.studentId?._id || g.studentId;
      const stName = g.studentId?.name || 'Học sinh';
      const stCode = g.studentId?.code || '';
      if (!stId) return;
      if (!stuMap.has(String(stId))) {
        stuMap.set(String(stId), { id: stId, name: stName, code: stCode, scores: {} });
      }
      const entry = stuMap.get(String(stId));
      entry.scores[String(g.subjectId?._id || g.subjectId)] = g.average;
    });

    const stuList = [...stuMap.values()].map((st) => {
      const scoreVals = Object.values(st.scores).filter((v) => v != null && !isNaN(v));
      const gpa = scoreVals.length > 0 ? Number((scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length).toFixed(2)) : null;
      let classification = '—';
      if (gpa != null) {
        const minScore = Math.min(...scoreVals);
        if (gpa >= 8.0 && minScore >= 6.5) classification = 'GIỎI';
        else if (gpa >= 6.5 && minScore >= 5.0) classification = 'KHÁ';
        else if (gpa >= 5.0 && minScore >= 3.5) classification = 'TRUNG BÌNH';
        else classification = 'YẾU';
      }
      return { ...st, gpa, classification };
    });

    const stats = { excellent: 0, good: 0, average: 0, weak: 0 };
    stuList.forEach((st) => {
      if (st.classification === 'GIỎI') stats.excellent += 1;
      else if (st.classification === 'KHÁ') stats.good += 1;
      else if (st.classification === 'TRUNG BÌNH') stats.average += 1;
      else if (st.classification === 'YẾU') stats.weak += 1;
    });

    return { students: stuList, subjects: subList, stats };
  }, [rows, summaryClassId, summarySemester]);

  const summaryColumns = [
    { title: 'Học sinh', dataIndex: 'name', key: 'name', fixed: 'left', width: 160 },
    { title: 'Mã HS', dataIndex: 'code', key: 'code', width: 100 },
    ...summaryData.subjects.map((sub) => ({
      title: sub.name,
      key: String(sub.id),
      width: 100,
      render: (_, r) => (r.scores[String(sub.id)] != null ? r.scores[String(sub.id)] : '—'),
    })),
    {
      title: 'ĐTB Chung',
      dataIndex: 'gpa',
      key: 'gpa',
      width: 110,
      render: (v) => (v != null ? <strong style={{ color: '#0f4c5c', fontSize: 15 }}>{v}</strong> : '—'),
    },
    {
      title: 'Học lực',
      dataIndex: 'classification',
      key: 'classification',
      width: 120,
      render: (v) => getClassificationTag(v),
    },
  ];

  return (
    <div>
      <Tabs
        defaultActiveKey="details"
        items={[
          {
            key: 'details',
            label: 'Sổ điểm chi tiết các môn',
            children: (
              <>
                {(canEnter || canExport(user, 'grades')) && (
                  <Space style={{ marginBottom: 16 }} wrap>
                    {canEnter && (
                      <Button type="primary" onClick={() => setOpen(true)}>
                        Nhập / cập nhật điểm
                      </Button>
                    )}
                    {canEnter && <ImportExcelButton type="grades" onDone={load} />}
                    {canExport(user, 'grades') && (
                      <Button
                        onClick={async () => {
                          try {
                            await downloadExport('grades');
                          } catch {
                            message.error('Xuất Excel thất bại');
                          }
                        }}
                      >
                        Xuất Excel
                      </Button>
                    )}
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
                    <Button
                      onClick={() => {
                        setFilterClass(null);
                        setFilterSubject(null);
                        setFilterSemester(null);
                      }}
                    >
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
              </>
            ),
          },
          {
            key: 'summary',
            label: 'Bảng tổng kết ĐTB & Học lực cả lớp',
            children: (
              <div>
                <Space wrap style={{ marginBottom: 16 }}>
                  <Select
                    placeholder="Chọn Lớp"
                    style={{ width: 180 }}
                    value={summaryClassId}
                    onChange={setSummaryClassId}
                    options={classes.map((c) => ({ value: c._id, label: c.name }))}
                  />
                  <Select
                    style={{ width: 140 }}
                    value={summarySemester}
                    onChange={setSummarySemester}
                    options={[
                      { value: 1, label: 'Học kỳ 1' },
                      { value: 2, label: 'Học kỳ 2' },
                    ]}
                  />
                </Space>

                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={6}>
                    <Card size="small">
                      <Statistic title="Học sinh Giỏi" value={summaryData.stats.excellent} valueStyle={{ color: '#2e7d32' }} />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small">
                      <Statistic title="Học sinh Khá" value={summaryData.stats.good} valueStyle={{ color: '#1565c0' }} />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small">
                      <Statistic title="Học sinh Trung bình" value={summaryData.stats.average} valueStyle={{ color: '#e65100' }} />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small">
                      <Statistic title="Học sinh Yếu" value={summaryData.stats.weak} valueStyle={{ color: '#c62828' }} />
                    </Card>
                  </Col>
                </Row>

                <Table
                  rowKey="id"
                  dataSource={summaryData.students}
                  columns={summaryColumns}
                  scroll={{ x: 'max-content' }}
                  pagination={{ pageSize: 20 }}
                />
              </div>
            ),
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
