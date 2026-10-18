import { useEffect, useState } from 'react';
import { Alert, Button, Form, Select, Space, Table, Tag, message, DatePicker, InputNumber } from 'antd';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import {
  getAttendanceApi,
  getClassStudentsApi,
  getClassesApi,
  getLeavesApi,
  getSubjectsApi,
  getTimetablesApi,
  recordAttendanceApi,
  downloadExport,
} from '../../services/api.service';
import ImportExcelButton from '../../components/ImportExcelButton';
import { can, canExport } from '../../utils/permissions';

const statusOptions = [
  { value: 'PRESENT', label: 'Có mặt' },
  { value: 'LATE', label: 'Đi trễ' },
  { value: 'ABSENT_EXCUSED', label: 'Vắng có phép' },
  { value: 'ABSENT_UNEXCUSED', label: 'Vắng không phép' },
];

const ATTENDANCE_STATUS_TAGS = {
  PRESENT: { label: 'Có mặt', color: 'green' },
  LATE: { label: 'Đi trễ', color: 'gold' },
  ABSENT_EXCUSED: { label: 'Có phép', color: 'orange' },
  ABSENT_UNEXCUSED: { label: 'Không phép', color: 'red' },
};

const AttendancePage = () => {
  const { user } = useSelector((s) => s.auth);
  const canTake = can(user, 'attendance', 'create') && can(user, 'attendance', 'update');

  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [leaves, setLeaves] = useState([]);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [myTodaySlots, setMyTodaySlots] = useState([]);
  const [form] = Form.useForm();

  const loadHistory = async () => {
    const res = await getAttendanceApi();
    if (res?.EC === 0) setRows(res.data || []);
  };

  useEffect(() => {
    (async () => {
      const [c, s, tt, lv] = await Promise.all([
        getClassesApi(),
        getSubjectsApi(),
        getTimetablesApi(),
        getLeavesApi({ status: 'APPROVED' }).catch(() => ({ EC: -1 })),
      ]);
      if (c?.EC === 0) setClasses(c.data || []);
      if (s?.EC === 0) setSubjects(s.data || []);
      if (lv?.EC === 0) setLeaves(lv.data || []);
      if (tt?.EC === 0 && tt.data) {
        const todayDow = dayjs().day() === 0 ? 7 : dayjs().day();
        const slots = [];
        tt.data.forEach((item) => {
          (item.slots || []).forEach((slot) => {
            const tId = slot.teacherId?._id || slot.teacherId;
            const isMySlot = !user?._id || String(tId) === String(user?._id);
            if (slot.dayOfWeek === todayDow && isMySlot) {
              slots.push({
                ...slot,
                classId: item.classId?._id || item.classId,
                className: item.classId?.name || 'Lớp',
                subjectId: slot.subjectId?._id || slot.subjectId,
                subjectName: slot.subjectId?.name || 'Môn',
              });
            }
          });
        });
        setMyTodaySlots(slots);
      }
      loadHistory();
    })();
  }, []);

  const getLeaveForStudent = (studentId, date = selectedDate) => {
    if (!date) return null;
    const target = dayjs(date).startOf('day');
    return leaves.find((l) => {
      if (l.status !== 'APPROVED' || l.type !== 'STUDENT_ABSENCE') return false;
      const sid = l.studentId?._id || l.studentId;
      if (String(sid) !== String(studentId)) return false;
      const from = dayjs(l.fromDate).startOf('day');
      const to = dayjs(l.toDate).endOf('day');
      return (target.isAfter(from) || target.isSame(from)) && (target.isBefore(to) || target.isSame(to));
    });
  };

  const onClassChange = async (classId, date = selectedDate) => {
    const res = await getClassStudentsApi(classId);
    if (res?.EC === 0) {
      const studentList = res.data || [];
      setStudents(studentList);
      const init = {};
      studentList.forEach((st) => {
        const lv = getLeaveForStudent(st._id, date);
        init[st._id] = lv ? 'ABSENT_EXCUSED' : 'PRESENT';
      });
      setRecords(init);
    }
  };

  const applySlot = (slot) => {
    form.setFieldsValue({
      classId: slot.classId,
      subjectId: slot.subjectId,
      period: slot.period,
      date: dayjs(),
    });
    onClassChange(slot.classId);
    message.success(`Đã tự động chọn Lớp ${slot.className}, Môn ${slot.subjectName}, Tiết ${slot.period}`);
  };

  const markAllPresent = () => {
    const all = {};
    students.forEach((st) => {
      all[st._id] = 'PRESENT';
    });
    setRecords(all);
    message.info('Đã đánh dấu tất cả học sinh có mặt');
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
      {(canTake || canExport(user, 'attendance')) && (
        <Space style={{ marginBottom: 16 }}>
          {canTake && <ImportExcelButton type="attendance" onDone={loadHistory} />}
          {canExport(user, 'attendance') && (
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
          )}
        </Space>
      )}

      {canTake && myTodaySlots.length > 0 && (
        <Alert
          style={{ marginBottom: 16 }}
          type="info"
          showIcon
          message={
            <Space wrap align="center">
              <span><strong>Tiết dạy hôm nay theo TKB:</strong></span>
              {myTodaySlots.map((slot, idx) => (
                <Button
                  key={idx}
                  size="small"
                  type="primary"
                  ghost
                  onClick={() => applySlot(slot)}
                >
                  Tiết {slot.period}: {slot.subjectName} ({slot.className})
                </Button>
              ))}
            </Space>
          }
        />
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
            <DatePicker
              format="DD/MM/YYYY"
              onChange={(d) => {
                if (d) {
                  setSelectedDate(d);
                  const cId = form.getFieldValue('classId');
                  if (cId) onClassChange(cId, d);
                }
              }}
            />
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
        <div style={{ marginBottom: 24 }}>
          {students.some((st) => getLeaveForStudent(st._id, selectedDate)) && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message={`Phát hiện ${students.filter((st) => getLeaveForStudent(st._id, selectedDate)).length} học sinh có đơn xin nghỉ phép hợp lệ trong ngày. Hệ thống đã tự động chọn trạng thái "Có phép".`}
            />
          )}
          <Space style={{ marginBottom: 8, justifyContent: 'space-between', width: '100%' }}>
            <span><strong>Danh sách điểm danh ({students.length} học sinh)</strong></span>
            <Button size="small" onClick={markAllPresent}>
              Tất cả có mặt
            </Button>
          </Space>
          <Table
            rowKey="_id"
            pagination={false}
            dataSource={students}
            columns={[
              { title: 'Học sinh', dataIndex: 'name' },
              { title: 'Mã', dataIndex: 'code' },
              {
                title: 'Đơn xin nghỉ phép',
                render: (_, r) => {
                  const lv = getLeaveForStudent(r._id, selectedDate);
                  return lv ? (
                    <Tag color="cyan">
                      Đơn phép: {lv.reason} ({dayjs(lv.fromDate).format('DD/MM')} - {dayjs(lv.toDate).format('DD/MM')})
                    </Tag>
                  ) : (
                    '—'
                  );
                },
              },
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
        </div>
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
                { title: 'Học sinh', render: (_, x) => x.studentId?.name || x.studentId },
                {
                  title: 'Trạng thái',
                  dataIndex: 'status',
                  render: (v) => {
                    const item = ATTENDANCE_STATUS_TAGS[v];
                    return item ? <Tag color={item.color}>{item.label}</Tag> : (v || '—');
                  },
                },
                { title: 'Ghi chú', dataIndex: 'note', render: (v) => v || '—' },
              ]}
            />
          ),
        }}
      />
    </div>
  );
};

export default AttendancePage;
