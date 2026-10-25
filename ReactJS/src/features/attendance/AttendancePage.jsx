import { useCallback, useEffect, useState } from 'react';
import { Button, Form, Space, Table, Tag, message } from 'antd';
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
import PageShell from '../../components/layout/PageShell';
import AttendanceEntryPanel from './AttendanceEntryPanel';
import { can, canExport } from '../../utils/permissions';



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
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [records, setRecords] = useState({});
  const [leaves, setLeaves] = useState([]);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [myTodaySlots, setMyTodaySlots] = useState([]);
  const [form] = Form.useForm();
  const classId = Form.useWatch('classId', form);
  const subjectId = Form.useWatch('subjectId', form);
  const attendanceDate = Form.useWatch('date', form);
  const canSubmitAttendance = Boolean(classId && subjectId && attendanceDate)
    && !studentsLoading
    && students.length > 0
    && students.every((student) => Boolean(records[student._id]));

  const loadHistory = useCallback(async () => {
    const res = await getAttendanceApi();
    if (res?.EC === 0) setRows(res.data || []);
  }, []);

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
  }, [loadHistory, user?._id]);

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
    if (!classId) {
      setStudents([]);
      setRecords({});
      return;
    }

    setStudentsLoading(true);
    try {
      const res = await getClassStudentsApi(classId);
      if (res?.EC === 0) {
        const studentList = res.data || [];
        setStudents(studentList);
        const init = {};
        studentList.forEach((st) => {
          const lv = getLeaveForStudent(st._id, date);
          init[st._id] = lv ? 'ABSENT_EXCUSED' : undefined;
        });
        setRecords(init);
      } else {
        setStudents([]);
        setRecords({});
        message.error(res?.EM || 'Không tải được danh sách học sinh');
      }
    } catch {
      setStudents([]);
      setRecords({});
      message.error('Không tải được danh sách học sinh');
    } finally {
      setStudentsLoading(false);
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
    const unmarked = students.filter((student) => !records[student._id]);
    if (unmarked.length) {
      message.error(`Còn ${unmarked.length} học sinh chưa được điểm danh`);
      return;
    }
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
    <PageShell
      title="Điểm danh"
      description="Ghi nhận chuyên cần theo lớp, môn học và ngày học; xem lại lịch sử ở bên dưới."
      actions={(canTake || canExport(user, 'attendance')) && (
        <Space wrap>
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
    >

      <AttendanceEntryPanel canTake={canTake} myTodaySlots={myTodaySlots} applySlot={applySlot} form={form} classes={classes} subjects={subjects} onClassChange={onClassChange} setSelectedDate={setSelectedDate} selectedDate={selectedDate} students={students} studentsLoading={studentsLoading} getLeaveForStudent={getLeaveForStudent} markAllPresent={markAllPresent} records={records} setRecords={setRecords} canSubmitAttendance={canSubmitAttendance} submit={submit} />

      <Space style={{ marginBottom: 8 }}>
        <strong>Lịch sử điểm danh</strong>
      </Space>
      <Table
        rowKey="_id"
        dataSource={rows}
        scroll={{ x: 'max-content' }}
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
              scroll={{ x: 'max-content' }}
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
    </PageShell>
  );
};

export default AttendancePage;
