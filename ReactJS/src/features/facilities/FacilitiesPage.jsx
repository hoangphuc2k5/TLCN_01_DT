import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { createFacilityApi, getFacilitiesApi, reviewFacilityApi } from '../../api';
import { ROLES } from '../../constants/roles';

const FacilitiesPage = () => {
  const { user } = useSelector((s) => s.auth);
  const canRequest = [
    ROLES.SUBJECT_TEACHER,
    ROLES.HOMEROOM_TEACHER,
    ROLES.ACADEMIC_AFFAIRS,
  ].includes(user?.role);
  const canReview = [ROLES.LIBRARIAN, ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS].includes(
    user?.role
  );
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    const res = await getFacilitiesApi();
    if (res?.EC === 0) setRows(res.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      {canRequest && (
        <Button type="primary" style={{ marginBottom: 16 }} onClick={() => setOpen(true)}>
          Đăng ký mượn
        </Button>
      )}
      <Table
        rowKey="_id"
        dataSource={rows}
        columns={[
          { title: 'Loại', dataIndex: 'itemType' },
          { title: 'Tên', dataIndex: 'itemName' },
          { title: 'Người mượn', render: (_, r) => r.requesterId?.name },
          {
            title: 'Từ',
            dataIndex: 'from',
            render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm'),
          },
          {
            title: 'Đến',
            dataIndex: 'to',
            render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm'),
          },
          {
            title: 'TT',
            dataIndex: 'status',
            render: (v) => <Tag>{v}</Tag>,
          },
          canReview
            ? {
                title: 'Duyệt',
                render: (_, r) =>
                  r.status === 'PENDING' ? (
                    <Space>
                      <Button
                        size="small"
                        type="primary"
                        onClick={async () => {
                          const res = await reviewFacilityApi(r._id, { status: 'APPROVED' });
                          if (res?.EC === 0) {
                            message.success(res.EM);
                            load();
                          } else message.error(res?.EM);
                        }}
                      >
                        Duyệt
                      </Button>
                      <Button
                        size="small"
                        danger
                        onClick={async () => {
                          const res = await reviewFacilityApi(r._id, { status: 'REJECTED' });
                          if (res?.EC === 0) {
                            message.success(res.EM);
                            load();
                          } else message.error(res?.EM);
                        }}
                      >
                        Từ chối
                      </Button>
                    </Space>
                  ) : r.status === 'APPROVED' ? (
                    <Button
                      size="small"
                      onClick={async () => {
                        const res = await reviewFacilityApi(r._id, {
                          status: 'RETURNED',
                          conditionOnReturn: 'OK',
                        });
                        if (res?.EC === 0) {
                          message.success(res.EM);
                          load();
                        } else message.error(res?.EM);
                      }}
                    >
                      Xác nhận trả
                    </Button>
                  ) : null,
              }
            : {},
        ].filter((c) => c.title)}
      />
      <Modal open={open} title="Mượn phòng / thiết bị" onCancel={() => setOpen(false)} onOk={() => form.submit()}>
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            const res = await createFacilityApi({
              ...v,
              from: new Date(v.from).toISOString(),
              to: new Date(v.to).toISOString(),
            });
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpen(false);
              form.resetFields();
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="itemType" label="Loại" initialValue="ROOM">
            <Select
              options={[
                { value: 'ROOM', label: 'Phòng' },
                { value: 'EQUIPMENT', label: 'Thiết bị' },
              ]}
            />
          </Form.Item>
          <Form.Item name="itemName" label="Tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="from" label="Từ" rules={[{ required: true }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="to" label="Đến" rules={[{ required: true }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FacilitiesPage;
