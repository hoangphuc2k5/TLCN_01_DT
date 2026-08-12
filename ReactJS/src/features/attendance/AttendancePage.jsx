import { useEffect, useState } from 'react';
import { Button, Form, Select, Space, Table, message, DatePicker, InputNumber } from 'antd';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import {
  getAttendanceApi,
  getClassStudentsApi,
  getClassesApi,
  getSubjectsApi,
  recordAttendanceApi,
  downloadExport,
} from '../../api';
import ImportExcelButton from '../../components/ImportExcelButton';
import { ROLES } from '../../constants/roles';

const statusOptions = [
  { value: 'PRESENT', label: 'Có mặt' },
  { value: 'LATE', label: 'Đi trễ' },
  { value: 'ABSENT_EXCUSED', label: 'Vắng có phép' },
  { value: 'ABSENT_UNEXCUSED', label: 'Vắng không phép' },
];

const AttendancePage = () => {
  const { user } = useSelector((s) => s.auth);
  const canTake = [
    ROLES.SUBJECT_TEACHER,
    ROLES.HOMEROOM_TEACHER,
    ROLES.SCHOOL_ADMIN,
    ROLES.ACADEMIC_AFFAIRS,
  ].includes(user?.role);

  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [form] = Form.useForm();

  const loadHistory = async () => {
    const res = await getAttendanceApi();
    if (res?.EC === 0) setRows(res.data || []);
  };

  useEffect(() => {
    (async () => {
      const [c, s] = await Promise.all([getClassesApi(), getSubjectsApi()]);
      if (c?.EC === 0) setClasses(c.data || []);
      if (s?.EC === 0) setSubjects(s.data || []);
      loadHistory();
    })();
  }, []);

  const onClassChange = async (classId) => {
    const res = await getClassStudentsApi(classId);
    if (res?.EC === 0) {
      setStudents(res.data || []);
      const init = {};
      (res.data || []).forEach((st) => {
        init[st._id] = 'PRESENT';
      });
      setRecords(init);
    }
  };

  const submit = async (values) => {
    const payload = {
      classId: values.classId,
      subjectId: values.subjectId,
      date: values.date.toISOString(),
      period: values.period || 1,
      records: Object.entries(records).map(([studentId, status]) => ({ studentId, status })),
    };
    const res = await recordAttendanceApi(payload);
    if (res?.EC === 0) {
      message.success(res.EM);
      loadHistory();
    } else message.error(res?.EM);
  };

  return (
    <div>
      {canTake && (
        <Space style={{ marginBottom: 16 }}>
          <ImportExcelButton type="attendance" onDone={loadHistory} />
          <Button
            onClick={async () => {
              try {
                await downloadExport('attendance');
              } catch {
                message.error('Xuất Excel thất bại');
              }
            }}
          >
            Xuất Excel
          </Button>
        </Space>
      )}
      {canTake && (
        <Form
          form={form}
          layout="inline"
          style={{ marginBottom: 24, gap: 8, flexWrap: 'wrap' }}
          onFinish={submit}
          initialValues={{ date: dayjs(), period: 1 }}
        >
          <Form.Item name="classId" rules={[{ required: true, message: 'Chọn lớp' }]}>
            <Select
              placeholder="Lớp"
              style={{ width: 140 }}
              options={classes.map((c) => ({ value: c._id, label: c.name }))}
              onChange={onClassChange}
            />
          </Form.Item>
          <Form.Item name="subjectId">
            <Select
              allowClear
              placeholder="Môn"
              style={{ width: 140 }}
              options={subjects.map((s) => ({ value: s._id, label: s.name }))}
            />
          </Form.Item>
          <Form.Item name="date" rules={[{ required: true }]}>
            <DatePicker />
          </Form.Item>
          <Form.Item name="period">
            <InputNumber min={1} max={10} placeholder="Tiết" />
          </Form.Item>
          <Button type="primary" htmlType="submit">
            Lưu điểm danh
          </Button>
        </Form>
      )}

      {canTake && students.length > 0 && (
        <Table
          style={{ marginBottom: 24 }}
          rowKey="_id"
          pagination={false}
          dataSource={students}
          columns={[
            { title: 'Học sinh', dataIndex: 'name' },
            { title: 'Mã', dataIndex: 'code' },
            {
              title: 'Trạng thái',
              render: (_, r) => (
                <Select
                  style={{ width: 180 }}
                  value={records[r._id]}
                  options={statusOptions}
                  onChange={(v) => setRecords((prev) => ({ ...prev, [r._id]: v }))}
                />
              ),
            },
          ]}
        />
      )}

      <Space style={{ marginBottom: 8 }}>
        <strong>Lịch sử điểm danh</strong>
      </Space>
      <Table
        rowKey="_id"
        dataSource={rows}
        columns={[
          {
            title: 'Ngày',
            dataIndex: 'date',
            render: (v) => dayjs(v).format('DD/MM/YYYY'),
          },
          { title: 'Tiết', dataIndex: 'period' },
          { title: 'Lớp', render: (_, r) => r.classId?.name },
          { title: 'Môn', render: (_, r) => r.subjectId?.name || '—' },
          { title: 'GV', render: (_, r) => r.teacherId?.name },
          {
            title: 'Sĩ số ghi nhận',
            render: (_, r) => r.records?.length || 0,
          },
        ]}
        expandable={{
          expandedRowRender: (r) => (
            <Table
              size="small"
              pagination={false}
              rowKey={(x) => x.studentId?._id || x.studentId}
              dataSource={r.records || []}
              columns={[
                { title: 'HS', render: (_, x) => x.studentId?.name || x.studentId },
                { title: 'TT', dataIndex: 'status' },
                { title: 'Ghi chú', dataIndex: 'note' },
              ]}
            />
          ),
        }}
      />
    </div>
  );
};

export default AttendancePage;
