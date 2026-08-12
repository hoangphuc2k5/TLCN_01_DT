import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Popconfirm, Space, Table, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { createAnnouncementApi, deleteAnnouncementApi, getAnnouncementsApi } from '../../api';
import { ROLES } from '../../constants/roles';

const AnnouncementsPage = () => {
  const { user } = useSelector((s) => s.auth);
  const canCreate = ![ROLES.STUDENT, ROLES.PARENT, ROLES.LIBRARIAN].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    const res = await getAnnouncementsApi();
    if (res?.EC === 0) setRows(res.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      {canCreate && (
        <Button type="primary" style={{ marginBottom: 16 }} onClick={() => setOpen(true)}>
          Soạn thông báo
        </Button>
      )}
      <Table
        rowKey="_id"
        dataSource={rows}
        columns={[
          {
            title: 'Tiêu đề',
            dataIndex: 'title',
            render: (v, r) => (
              <Space>
                {r.isPinned ? <Tag color="blue">Ghim</Tag> : null}
                {v}
              </Space>
            ),
          },
          { title: 'Phạm vi', dataIndex: 'scope' },
          { title: 'Người gửi', render: (_, r) => r.createdBy?.name },
          {
            title: 'Ngày',
            dataIndex: 'createdAt',
            render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm'),
          },
          {
            title: 'Thao tác',
            render: (_, r) => (
              <Popconfirm
                title="Xóa thông báo?"
                onConfirm={async () => {
                  const res = await deleteAnnouncementApi(r._id);
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
        expandable={{
          expandedRowRender: (r) => <div style={{ whiteSpace: 'pre-wrap' }}>{r.content}</div>,
        }}
      />
      <Modal open={open} title="Thông báo mới" onCancel={() => setOpen(false)} onOk={() => form.submit()}>
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            const res = await createAnnouncementApi(v);
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
          <Form.Item name="content" label="Nội dung" rules={[{ required: true }]}>
            <Input.TextArea rows={5} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AnnouncementsPage;
