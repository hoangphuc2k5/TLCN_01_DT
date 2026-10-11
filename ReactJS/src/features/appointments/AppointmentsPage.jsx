import { useEffect, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import {
  cancelAppointmentApi,
  createAppointmentApi,
  getAppointmentsApi,
  getUserDirectoryApi,
  reviewAppointmentApi,
  submitSurveyApi,
} from '../../services/api.service';
import { ROLES } from '../../constants/roles';
import { can } from '../../utils/permissions';

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

  const load = async () => {
    const res = await getAppointmentsApi();
    if (res?.EC === 0) setRows(res.data || []);
  };

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
  }, []);

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

      {/* Modal đặt lịch hẹn */}
      <Modal
        open={open}
        title="Đặt lịch hẹn trao đổi với giáo viên"
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText="Gửi yêu cầu đặt lịch"
        cancelText="Hủy"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            const res = await createAppointmentApi(v);
            if (res?.EC === 0) {
              setOpen(false);
              message.success('Đã gửi yêu cầu đặt lịch hẹn');
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="studentId" label="Học sinh (con/em)" rules={[{ required: true, message: 'Chọn học sinh' }]}>
            <Select
              placeholder="Chọn học sinh"
              options={students.map((s) => ({ value: s._id, label: `${s.name} (${s.code || 'HS'})` }))}
            />
          </Form.Item>
          <Form.Item name="teacherId" label="Giáo viên cần gặp" rules={[{ required: true, message: 'Chọn giáo viên' }]}>
            <Select
              placeholder="Chọn giáo viên"
              options={teachers.map((t) => ({ value: t._id, label: `${t.name} (${t.email})` }))}
            />
          </Form.Item>
          <Form.Item name="scheduledAt" label="Thời gian hẹn" rules={[{ required: true, message: 'Chọn thời gian' }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Space style={{ width: '100%' }}>
            <Form.Item name="durationMinutes" label="Thời lượng (phút)" initialValue={30} style={{ minWidth: 160 }}>
              <InputNumber min={15} max={120} step={15} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="mode" label="Hình thức gặp" initialValue="ONLINE" style={{ minWidth: 160 }}>
              <Select
                options={[
                  { value: 'ONLINE', label: 'Trực tuyến (Online)' },
                  { value: 'OFFLINE', label: 'Gặp trực tiếp tại trường' },
                ]}
              />
            </Form.Item>
          </Space>
          <Form.Item name="reason" label="Lý do / Nội dung cần trao đổi" rules={[{ required: true, message: 'Nhập lý do' }]}>
            <Input.TextArea rows={3} maxLength={1000} placeholder="Trình bày vắn tắt nội dung phụ huynh muốn trao đổi với giáo viên..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal khảo sát hài lòng */}
      <Modal
        open={!!survey}
        title="Khảo sát mức độ hài lòng buổi trao đổi"
        onCancel={() => setSurvey(null)}
        onOk={() => surveyForm.submit()}
        okText="Gửi đánh giá"
        cancelText="Hủy"
      >
        <Form
          form={surveyForm}
          layout="vertical"
          onFinish={async (v) => {
            const res = await submitSurveyApi(survey._id, v);
            if (res?.EC === 0) {
              setSurvey(null);
              message.success('Đã gửi đánh giá khảo sát. Cảm ơn bạn!');
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="rating" label="Đánh giá mức độ hài lòng (1 - 5 sao)" rules={[{ required: true }]}>
            <InputNumber min={1} max={5} style={{ width: '100%' }} placeholder="Cho điểm từ 1 đến 5" />
          </Form.Item>
          <Form.Item name="comment" label="Nhận xét / Ý kiến đóng góp">
            <Input.TextArea rows={4} maxLength={2000} placeholder="Nhận xét về thái độ, nội dung buổi làm việc..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AppointmentsPage;
