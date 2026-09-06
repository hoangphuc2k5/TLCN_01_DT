import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { createCalendarApi, deleteCalendarApi, downloadExport, getCalendarApi } from '../../api';
import { useSelector } from 'react-redux';
import { can, canExport } from '../../util/permissions';
import { ROLES } from '../../constants/roles';

const CalendarPage = () => {
  const { user } = useSelector((s) => s.auth);
  const canCreate = can(user, 'announcements', 'create');
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    const res = await getCalendarApi();
    if (res?.EC === 0) setRows(res.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        {canCreate && (
          <Button type="primary" onClick={() => setOpen(true)}>
            Thêm sự kiện
          </Button>
        )}
        {canExport(user, 'grades') && <Button onClick={() => downloadExport('grades').catch((e) => message.error(e.message))}>
          Xuất Excel điểm
        </Button>}
        {canExport(user, 'fees') && <Button onClick={() => downloadExport('fees').catch((e) => message.error(e.message))}>
          Xuất Excel học phí
        </Button>}
        {canExport(user, 'attendance') && <Button onClick={() => downloadExport('attendance').catch((e) => message.error(e.message))}>
          Xuất Excel điểm danh
        </Button>}
      </Space>
      <Table
        rowKey="_id"
        dataSource={rows}
        columns={[
          { title: 'Tiêu đề', dataIndex: 'title' },
          {
            title: 'Loại',
            dataIndex: 'type',
            render: (v) => <Tag>{v}</Tag>,
          },
          {
            title: 'Bắt đầu',
            dataIndex: 'startAt',
            render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm'),
          },
          {
            title: 'Kết thúc',
            dataIndex: 'endAt',
            render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm'),
          },
          { title: 'Lớp', render: (_, r) => r.classId?.name || '—' },
          { title: 'Người tạo', render: (_, r) => r.createdBy?.name },
          {
            title: 'Xóa',
            render: (_, r) => can(user, 'announcements', 'delete') && ((r.createdBy?._id || r.createdBy) === user?._id || [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS].includes(user?.role)) && (
              <Popconfirm
                title="Xóa sự kiện?"
                onConfirm={async () => {
                  const res = await deleteCalendarApi(r._id);
                  if (res?.EC === 0) {
                    message.success(res.EM);
                    load();
                  } else message.error(res?.EM);
                }}
              >
                <Button size="small" danger>
                  Xóa
                </Button>
              </Popconfirm>
            ),
          },
        ]}
      />
      <Modal open={open} title="Sự kiện lịch" onCancel={() => setOpen(false)} onOk={() => form.submit()}>
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            const res = await createCalendarApi(v);
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpen(false);
              form.resetFields();
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="Loại" initialValue="EVENT">
            <Select
              options={[
                { value: 'EVENT', label: 'Sự kiện' },
                { value: 'EXAM', label: 'Thi' },
                { value: 'HOLIDAY', label: 'Nghỉ lễ' },
                { value: 'MAKEUP', label: 'Dạy bù' },
                { value: 'MEETING', label: 'Họp' },
                { value: 'OTHER', label: 'Khác' },
              ]}
            />
          </Form.Item>
          <Form.Item name="startAt" label="Bắt đầu" rules={[{ required: true }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="endAt" label="Kết thúc" rules={[{ required: true }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CalendarPage;
