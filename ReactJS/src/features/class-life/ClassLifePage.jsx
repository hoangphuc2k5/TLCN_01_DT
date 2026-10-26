import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Form, Select, Space, Table, Tag, message } from 'antd';
import { useSelector } from 'react-redux';
import {
  cancelParentMeetingApi,  getAcademicYearsApi,
  getClassActivitiesApi,
  getClassesApi,
  getParentMeetingsApi,
  publishClassActivityApi,} from '../../services/api.service';
import { can } from '../../utils/permissions';
import dayjs from 'dayjs';
import ClassLifeDialogs from './ClassLifeDialogs';

const RSVP_STATUS_LABELS = {
  GOING: 'Sẽ tham gia',
  MAYBE: 'Có thể',
  DECLINED: 'Không thể tham gia',
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

  const load = useCallback(async () => {
    const [a, m] = await Promise.all([getClassActivitiesApi(), getParentMeetingsApi()]);
    if (a?.EC === 0) setActivities(a.data || []);
    if (m?.EC === 0) setMeetings(m.data || []);
  }, []);

  useEffect(() => {
    (async () => {
      if (manage) {
        const [c, y] = await Promise.all([getClassesApi(), getAcademicYearsApi()]);
        setClasses(c?.data || []);
        setYears(y?.data || []);
      }
      await load();
    })();
  }, [load, manage]);

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

      <ClassLifeDialogs activityOpen={activityOpen} setActivityOpen={setActivityOpen} activityForm={activityForm} selectClass={selectClass} selectYear={selectYear} load={load} meetingOpen={meetingOpen} setMeetingOpen={setMeetingOpen} meetingForm={meetingForm} rsvpTarget={rsvpTarget} setRsvpTarget={setRsvpTarget} rsvpForm={rsvpForm} />
    </Space>
  );
}
