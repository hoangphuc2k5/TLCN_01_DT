import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import { useSelector } from 'react-redux';
import {
  cancelParentMeetingApi,
  createClassActivityApi,
  createParentMeetingApi,
  getAcademicYearsApi,
  getClassActivitiesApi,
  getClassesApi,
  getParentMeetingsApi,
  publishClassActivityApi,
  rsvpParentMeetingApi,
} from '../../services/api.service';
import { can } from '../../utils/permissions';
import dayjs from 'dayjs';

const RSVP_STATUS_LABELS = {
  GOING: 'Sẽ tham gia',
  MAYBE: 'Có thể',
  DECLINED: 'Không thể tham gia',
};

const RSVP_STATUS_COLORS = {
  GOING: 'green',
  MAYBE: 'orange',
  DECLINED: 'red',
};

export default function ClassLifePage() {
  const { user } = useSelector((s) => s.auth);
  const manage = can(user, 'class_activities', 'execute');
  const parent = user?.role === 'PARENT';

  const [activities, setActivities] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [activityOpen, setActivityOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [rsvpTarget, setRsvpTarget] = useState(null);
  const [activityForm] = Form.useForm();
  const [meetingForm] = Form.useForm();
  const [rsvpForm] = Form.useForm();

  const load = async () => {
    const [a, m] = await Promise.all([getClassActivitiesApi(), getParentMeetingsApi()]);
    if (a?.EC === 0) setActivities(a.data || []);
    if (m?.EC === 0) setMeetings(m.data || []);
  };

  useEffect(() => {
    (async () => {
      if (manage) {
        const [c, y] = await Promise.all([getClassesApi(), getAcademicYearsApi()]);
        setClasses(c?.data || []);
        setYears(y?.data || []);
      }
      await load();
    })();
  }, []);

  const activityColumns = [
    { title: 'Tiêu đề hoạt động', dataIndex: 'title' },
    { title: 'Lớp', render: (_, r) => r.classId?.name || '-' },
    {
      title: 'Thời gian',
      dataIndex: 'scheduledAt',
      render: (x) => (x ? dayjs(x).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (x) => <Tag color={x === 'PUBLISHED' ? 'green' : 'gold'}>{x === 'PUBLISHED' ? 'Đã công bố' : 'Bản nháp'}</Tag>,
    },
    {
      title: 'Thao tác',
      render: (_, r) =>
        manage &&
        r.status === 'DRAFT' && (
          <Button
            size="small"
            type="primary"
            onClick={async () => {
              const res = await publishClassActivityApi(r._id);
              if (res?.EC === 0) {
                message.success('Đã công bố hoạt động');
                load();
              } else message.error(res?.EM);
            }}
          >
            Công bố
          </Button>
        ),
    },
  ];

  const meetingColumns = [
    { title: 'Tiêu đề cuộc họp', dataIndex: 'title' },
    { title: 'Lớp', render: (_, r) => r.classId?.name || '-' },
    {
      title: 'Thời gian họp',
      dataIndex: 'scheduledAt',
      render: (x) => (x ? dayjs(x).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Phòng họp trực tuyến',
      render: (_, r) =>
        r.meetingUrl ? (
          <a href={r.meetingUrl} target="_blank" rel="noreferrer">
            Vào phòng họp
          </a>
        ) : (
          '-'
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (v) => (
        <Tag color={v === 'SCHEDULED' ? 'blue' : v === 'CANCELLED' ? 'red' : 'default'}>
          {v === 'SCHEDULED' ? 'Đã lên lịch' : v === 'CANCELLED' ? 'Đã hủy' : v}
        </Tag>
      ),
    },
    {
      title: 'Phản hồi tham gia',
      render: (_, r) =>
        parent ? (
          <Button
            size="small"
            aria-label="Respond"
            type={r.response?.status ? 'default' : 'primary'}
            onClick={() => {
              rsvpForm.resetFields();
              rsvpForm.setFieldsValue({
                status: r.response?.status || 'GOING',
                note: r.response?.note || '',
              });
              setRsvpTarget(r);
            }}
          >
            {RSVP_STATUS_LABELS[r.response?.status] || 'Phản hồi'}
          </Button>
        ) : (
          manage &&
          r.status === 'SCHEDULED' && (
            <Button
              size="small"
              danger
              onClick={async () => {
                const res = await cancelParentMeetingApi(r._id);
                if (res?.EC === 0) {
                  message.success('Đã hủy cuộc họp');
                  load();
                } else message.error(res?.EM);
              }}
            >
              Hủy họp
            </Button>
          )
        ),
    },
  ];

  const selectClass = (
    <Select placeholder="Chọn lớp" options={classes.map((x) => ({ value: x._id, label: x.name }))} />
  );
  const selectYear = (
    <Select placeholder="Chọn năm học" options={years.map((x) => ({ value: x._id, label: x.name }))} />
  );

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card
        title="Hoạt động ngoại khóa & Sinh hoạt lớp"
        extra={
          manage && (
            <Button type="primary" onClick={() => setActivityOpen(true)}>
              Tạo hoạt động mới
            </Button>
          )
        }
      >
        <Table rowKey="_id" dataSource={activities} columns={activityColumns} />
      </Card>

      <Card
        title="Họp phụ huynh trực tuyến"
        extra={
          manage && (
            <Button type="primary" onClick={() => setMeetingOpen(true)}>
              Lên lịch họp phụ huynh
            </Button>
          )
        }
      >
        <Table rowKey="_id" dataSource={meetings} columns={meetingColumns} />
      </Card>

      {/* Modal tạo hoạt động lớp */}
      <Modal
        open={activityOpen}
        title="Tạo hoạt động lớp mới"
        onCancel={() => setActivityOpen(false)}
        onOk={() => activityForm.submit()}
        okText="Tạo hoạt động"
        cancelText="Hủy"
      >
        <Form
          form={activityForm}
          layout="vertical"
          onFinish={async (v) => {
            const r = await createClassActivityApi({
              ...v,
              scheduledAt: new Date(v.scheduledAt).toISOString(),
            });
            if (r?.EC === 0) {
              message.success('Tạo hoạt động thành công');
              setActivityOpen(false);
              activityForm.resetFields();
              load();
            } else message.error(r?.EM);
          }}
        >
          <Form.Item name="classId" label="Lớp học" rules={[{ required: true, message: 'Chọn lớp' }]}>
            {selectClass}
          </Form.Item>
          <Form.Item name="academicYearId" label="Năm học" rules={[{ required: true, message: 'Chọn năm học' }]}>
            {selectYear}
          </Form.Item>
          <Form.Item name="title" label="Tiêu đề hoạt động" rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
            <Input placeholder="VD: Sinh hoạt cuối tuần, Tham quan dã ngoại..." />
          </Form.Item>
          <Form.Item name="scheduledAt" label="Thời gian diễn ra" rules={[{ required: true, message: 'Chọn thời gian' }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="agenda" label="Kế hoạch / Nội dung chi tiết">
            <Input.TextArea rows={3} placeholder="Mô tả nội dung chương trình..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal lên lịch họp phụ huynh */}
      <Modal
        open={meetingOpen}
        title="Lên lịch họp phụ huynh"
        onCancel={() => setMeetingOpen(false)}
        onOk={() => meetingForm.submit()}
        okText="Lên lịch họp"
        cancelText="Hủy"
      >
        <Form
          form={meetingForm}
          layout="vertical"
          onFinish={async (v) => {
            const r = await createParentMeetingApi({
              ...v,
              scheduledAt: new Date(v.scheduledAt).toISOString(),
            });
            if (r?.EC === 0) {
              message.success('Lên lịch họp thành công');
              setMeetingOpen(false);
              meetingForm.resetFields();
              load();
            } else message.error(r?.EM);
          }}
        >
          <Form.Item name="classId" label="Lớp học" rules={[{ required: true, message: 'Chọn lớp' }]}>
            {selectClass}
          </Form.Item>
          <Form.Item name="academicYearId" label="Năm học" rules={[{ required: true, message: 'Chọn năm học' }]}>
            {selectYear}
          </Form.Item>
          <Form.Item name="title" label="Tiêu đề cuộc họp" rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
            <Input placeholder="VD: Họp phụ huynh đầu năm học..." />
          </Form.Item>
          <Form.Item name="scheduledAt" label="Thời gian bắt đầu" rules={[{ required: true, message: 'Chọn thời gian' }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="meetingUrl" label="Đường link họp trực tuyến (Google Meet, Zoom, MS Teams...)">
            <Input placeholder="https://meet.google.com/..." />
          </Form.Item>
          <Form.Item name="agenda" label="Nội dung chương trình họp">
            <Input.TextArea rows={3} placeholder="Các nội dung chính cần thảo luận..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal phản hồi họp phụ huynh (RSVP) */}
      <Modal
        open={!!rsvpTarget}
        title="Phản hồi tham gia họp phụ huynh"
        onCancel={() => setRsvpTarget(null)}
        onOk={() => rsvpForm.submit()}
        okText="Gửi phản hồi"
        cancelText="Hủy"
      >
        <Form
          form={rsvpForm}
          layout="vertical"
          onFinish={async (v) => {
            const r = await rsvpParentMeetingApi(rsvpTarget._id, v);
            if (r?.EC === 0) {
              message.success('Đã gửi phản hồi tham gia họp');
              setRsvpTarget(null);
              load();
            } else message.error(r?.EM);
          }}
        >
          <Form.Item name="status" label="Xác nhận tham gia" initialValue="GOING" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'GOING', label: 'Sẽ tham gia cuộc họp' },
                { value: 'MAYBE', label: 'Có thể tham gia (chưa chắc chắn)' },
                { value: 'DECLINED', label: 'Không thể tham gia (bận việc đột xuất)' },
              ]}
            />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú / Lý do (nếu có)">
            <Input.TextArea rows={3} placeholder="Để lại lời nhắn cho giáo viên chủ nhiệm..." />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
