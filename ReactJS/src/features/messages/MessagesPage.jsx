import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Table, Tabs, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { getMessagesApi, getUserDirectoryApi, markMessageReadApi, openMessageRealtime, sendMessageApi } from '../../api';

const MessagesPage = () => {
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState('CONNECTING');
  const cursorRef = useRef('');
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    const [i, s] = await Promise.all([
      getMessagesApi({ box: 'inbox' }),
      getMessagesApi({ box: 'sent' }),
    ]);
    if (i?.EC === 0) setInbox(i.data || []);
    if (s?.EC === 0) setSent(s.data || []);
    const newest = [...(i?.data || []), ...(s?.data || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    if (newest?._id) cursorRef.current = newest._id;
  }, []);

  useEffect(() => {
    let stopRealtime; let disposed = false;
    (async () => {
      const u = await getUserDirectoryApi();
      if (disposed) return;
      if (u?.EC === 0) setUsers(u.data || []);
      await load();
      if (disposed) return;
      stopRealtime = openMessageRealtime({
        getCursor: () => cursorRef.current,
        onStatus: setRealtimeStatus,
        onEvent: event => {
          if (event.type === 'ready' && event.cursor) cursorRef.current = event.cursor;
          if (!['message.created', 'resync.required'].includes(event.type)) return;
          if (event.message?._id) cursorRef.current = event.message._id;
          load();
        },
      });
    })();
    return () => { disposed = true; stopRealtime?.(); };
  }, [load]);

  const columnsInbox = [
    {
      title: 'Từ',
      render: (_, r) => r.senderId?.name,
    },
    { title: 'Tiêu đề', dataIndex: 'subject', render: (v) => v || '(Không tiêu đề)' },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      render: (v) => dayjs(v).format('DD/MM HH:mm'),
    },
    {
      title: 'TT',
      dataIndex: 'isRead',
      render: (v) => (v ? <Tag>Đã đọc</Tag> : <Tag color="blue">Mới</Tag>),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => setOpen(true)}>Soạn tin nhắn</Button>
        <Tag color={realtimeStatus === 'CONNECTED' ? 'green' : 'gold'}>{realtimeStatus === 'CONNECTED' ? 'Realtime đã kết nối' : 'Đang kết nối lại'}</Tag>
      </Space>
      <Tabs
        items={[
          {
            key: 'inbox',
            label: 'Hộp thư đến',
            children: (
              <Table
                rowKey="_id"
                dataSource={inbox}
                columns={columnsInbox}
                onRow={(r) => ({
                  onClick: async () => {
                    if (!r.isRead) {
                      await markMessageReadApi(r._id);
                      load();
                    }
                    Modal.info({
                      title: r.subject || 'Tin nhắn',
                      content: (
                        <div>
                          <p>
                            <strong>Từ:</strong> {r.senderId?.name} ({r.senderId?.email})
                          </p>
                          <pre style={{ whiteSpace: 'pre-wrap' }}>{r.body}</pre>
                        </div>
                      ),
                      width: 560,
                    });
                  },
                })}
              />
            ),
          },
          {
            key: 'sent',
            label: 'Đã gửi',
            children: (
              <Table
                rowKey="_id"
                dataSource={sent}
                columns={[
                  { title: 'Đến', render: (_, r) => r.receiverId?.name },
                  { title: 'Tiêu đề', dataIndex: 'subject' },
                  {
                    title: 'Thời gian',
                    dataIndex: 'createdAt',
                    render: (v) => dayjs(v).format('DD/MM HH:mm'),
                  },
                ]}
              />
            ),
          },
        ]}
      />
      <Modal open={open} title="Gửi tin nhắn nội bộ" onCancel={() => setOpen(false)} onOk={() => form.submit()}>
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            const res = await sendMessageApi(v);
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpen(false);
              form.resetFields();
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="receiverId" label="Người nhận" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={users.map((u) => ({
                value: u._id,
                label: `${u.name} (${u.email})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="subject" label="Tiêu đề">
            <Input />
          </Form.Item>
          <Form.Item name="body" label="Nội dung" rules={[{ required: true }]}>
            <Input.TextArea rows={5} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MessagesPage;
