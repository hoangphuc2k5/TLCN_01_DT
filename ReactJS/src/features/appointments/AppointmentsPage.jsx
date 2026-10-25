import { useCallback, useEffect, useState } from 'react';
import { Button, Form, Space, Table, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import {
  cancelAppointmentApi,  getAppointmentsApi,
  getUserDirectoryApi,
  reviewAppointmentApi,} from '../../services/api.service';
import { ROLES } from '../../constants/roles';
import { can } from '../../utils/permissions';
import AppointmentDialogs from './AppointmentDialogs';

const STATUS_LABELS = {
  REQUESTED: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  DECLINED: 'Từ chối',
  CANCELLED: 'Đã hủy',
  COMPLETED: 'Hoàn tất',
};

const statusColor = {
  REQUESTED: 'gold',
  CONFIRMED: 'green',
  DECLINED: 'red',
  CANCELLED: 'default',
  COMPLETED: 'blue',
};

const AppointmentsPage = () => {
  const { user } = useSelector((s) => s.auth);
  const isParent = user?.role === ROLES.PARENT;
  const canManage = can(user, 'appointments', 'update');
  const canRequest = can(user, 'appointments', 'create');
  const canSurvey = can(user, 'surveys', 'create');
  const [rows, setRows] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [open, setOpen] = useState(false);
  const [survey, setSurvey] = useState(null);
  const [form] = Form.useForm();
  const [surveyForm] = Form.useForm();

  const load = useCallback(async () => {
    const res = await getAppointmentsApi();
    if (res?.EC === 0) setRows(res.data || []);
  }, []);

  useEffect(() => {
    load();
    if (isParent && canRequest) {
      Promise.all([
        getUserDirectoryApi({ role: ROLES.STUDENT }),
        getUserDirectoryApi({ role: ROLES.SUBJECT_TEACHER }),
        getUserDirectoryApi({ role: ROLES.HOMEROOM_TEACHER }),
      ]).then(([s, t, h]) => {
        if (s?.EC === 0) {
          setStudents((s.data || []).filter((row) => (user.parentOf || []).some((id) => String(id) === String(row._id))));
        }
        if (t?.EC === 0 || h?.EC === 0) {
          setTeachers([...(t?.data || []), ...(h?.data || [])]);
        }
      });
    }
  }, [canRequest, isParent, load, user?.parentOf]);

  const review = async (row, status) => {
    const res = await reviewAppointmentApi(row._id, { status });
    if (res?.EC === 0) {
      message.success(status === 'CONFIRMED' ? 'Đã xác nhận lịch hẹn' : status === 'DECLINED' ? 'Đã từ chối lịch hẹn' : 'Đã hoàn tất lịch hẹn');
      load();
    } else message.error(res?.EM);
  };

  return (
    <div>
      {isParent && canRequest && (
        <Button
          type="primary"
          onClick={() => {
            form.resetFields();
            setOpen(true);
          }}
        >
          Đặt lịch hẹn với giáo viên
        </Button>
      )}
      <Table
        rowKey="_id"
        style={{ marginTop: 16 }}
        dataSource={rows}
        columns={[
          {
            title: 'Thời gian',
            dataIndex: 'scheduledAt',
            render: (v) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '-'),
          },
          { title: 'Giáo viên', render: (_, r) => r.teacherId?.name || '-' },
          { title: 'Học sinh', render: (_, r) => r.studentId?.name || '-' },
          { title: 'Lý do gặp', dataIndex: 'reason', ellipsis: true },
          {
            title: 'Hình thức',
            dataIndex: 'mode',
            render: (v) => (v === 'ONLINE' ? <Tag color="cyan">Trực tuyến</Tag> : <Tag color="blue">Tại trường</Tag>),
          },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (v) => <Tag color={statusColor[v]}>{STATUS_LABELS[v] || v}</Tag>,
          },
          {
            title: 'Thao tác',
            render: (_, r) => (
              <Space>
                {canManage && ['REQUESTED', 'CONFIRMED'].includes(r.status) && (
                  <>
                    {r.status === 'REQUESTED' && (
                      <Button size="small" type="primary" onClick={() => review(r, 'CONFIRMED')}>
                        Xác nhận
                      </Button>
                    )}
                    <Button size="small" danger onClick={() => review(r, 'DECLINED')}>
                      Từ chối
                    </Button>
                    {r.status === 'CONFIRMED' && (
                      <Button size="small" onClick={() => review(r, 'COMPLETED')}>
                        Hoàn tất
                      </Button>
                    )}
                  </>
                )}
                {canRequest && ['REQUESTED', 'CONFIRMED'].includes(r.status) && (
                  <Button
                    size="small"
                    danger
                    onClick={async () => {
                      const res = await cancelAppointmentApi(r._id);
                      if (res?.EC === 0) {
                        message.success('Đã hủy lịch hẹn');
                        load();
                      } else message.error(res?.EM);
                    }}
                  >
                    Hủy lịch
                  </Button>
                )}
                {isParent && canSurvey && r.status === 'COMPLETED' && (
                  <Button
                    size="small"
                    onClick={() => {
                      setSurvey(r);
                      surveyForm.resetFields();
                    }}
                  >
                    Khảo sát
                  </Button>
                )}
              </Space>
            ),
          },
        ].filter((c) => c.title)}
      />

      <AppointmentDialogs open={open} setOpen={setOpen} form={form} students={students} teachers={teachers} load={load} survey={survey} setSurvey={setSurvey} surveyForm={surveyForm} />
    </div>
  );
};

export default AppointmentsPage;
