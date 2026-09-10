import { useEffect, useState } from 'react';
import { Button, DatePicker, Form, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { getJobsApi, retryJobApi, cancelJobApi } from '../../api';
import { can } from '../../util/permissions';

const states = { QUEUED: 'Chờ chạy', RUNNING: 'Đang chạy', SUCCEEDED: 'Hoàn thành', FAILED: 'Thất bại', CANCELLED: 'Đã hủy', SKIPPED: 'Bỏ qua' };
const errors = { SMTP_UNCONFIGURED: 'Chưa cấu hình email', SMTP_SEND_FAILED: 'Gửi email thất bại', FILE_DELETE_FAILED: 'Chưa xóa được file', LEASE_EXPIRED: 'Worker bị gián đoạn', JOB_EXECUTION_FAILED: 'Xử lý thất bại', HANDLER_UNAVAILABLE: 'Chưa hỗ trợ loại tác vụ' };
const outcomes = { NOTIFICATION_REMOVED: 'Thông báo đã bị xóa', RECIPIENT_INACTIVE: 'Người nhận không còn hoạt động', RECIPIENT_SCOPE_CHANGED: 'Người nhận đã đổi phạm vi', RECIPIENT_NOT_DELIVERABLE: 'Địa chỉ không được hỗ trợ', FILE_NOT_DELETING: 'File chưa được phép xóa' };
export default function JobsPage() {
  const user = useSelector(s => s.auth.user);
  const [data, setData] = useState({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState();
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const load = async () => {
    setLoading(true);
    try {
      const result = await getJobsApi({ page, limit: 25, status });
      if (result?.EC === 0) setData(result.data);
      else message.error(result?.EM || 'Không tải được tác vụ');
    } catch { message.error('Không kết nối được máy chủ'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page, status]);
  const execute = can(user, 'jobs', 'execute');
  return <div>
    <Typography.Title level={3}>Tác vụ nền</Typography.Title>
    <Space style={{ marginBottom: 16 }}>
      <Select aria-label="Trạng thái tác vụ" allowClear placeholder="Tất cả trạng thái" style={{ width: 210 }} value={status}
        options={Object.entries(states).map(([value, label]) => ({ value, label }))} onChange={value => { setStatus(value); setPage(1); }} />
      <Button onClick={load}>Làm mới</Button>
    </Space>
    <Table rowKey="_id" loading={loading} dataSource={data.items} pagination={{ current: page, pageSize: 25, total: data.total, showSizeChanger: false, onChange: setPage }} columns={[
      { title: 'Tác vụ', render: (_, row) => <><div>{row.kind === 'FILE_DELETE' ? 'Xóa file' : 'Email thông báo'}</div><Typography.Text type="secondary">{row.label}</Typography.Text></> },
      { title: 'Trạng thái', render: (_, row) => <Tag color={row.status === 'FAILED' ? 'red' : row.status === 'SUCCEEDED' ? 'green' : 'blue'}>{states[row.status]}</Tag> },
      { title: 'Lượt thử', render: (_, row) => `${row.attempts}/${row.maxAttempts}` },
      { title: 'Lịch chạy', render: (_, row) => dayjs(row.runAt).format('DD/MM/YYYY HH:mm:ss') },
      { title: 'Kết quả / lỗi', render: (_, row) => errors[row.lastError] || outcomes[row.outcome] || '—' },
      ...(execute ? [{ title: 'Thao tác', render: (_, row) => <Space>
        {['FAILED', 'CANCELLED'].includes(row.status) && <Button size="small" onClick={() => { form.resetFields(); setRetry(row); }}>Thử lại</Button>}
        {row.status === 'QUEUED' && <Popconfirm title="Hủy tác vụ đang chờ?" onConfirm={async () => {
          try { const result = await cancelJobApi(row._id); if (result?.EC === 0) { message.success(result.EM); await load(); } else message.error(result?.EM); }
          catch { message.error('Không hủy được tác vụ'); }
        }}><Button size="small" danger>Hủy</Button></Popconfirm>}
      </Space> }] : []),
    ]} />
    <Modal title="Lên lịch thử lại" open={!!retry} onCancel={() => !saving && setRetry(null)} confirmLoading={saving} onOk={() => form.submit()}>
      <Form form={form} layout="vertical" onFinish={async values => {
        if (saving) return;
        setSaving(true);
        try {
          const result = await retryJobApi(retry._id, values.runAt ? { runAt: values.runAt.toISOString() } : {});
          if (result?.EC === 0) { message.success(result.EM); setRetry(null); await load(); } else message.error(result?.EM);
        } catch { message.error('Không lên lịch được tác vụ'); }
        finally { setSaving(false); }
      }}><Form.Item name="runAt" label="Chạy lúc" extra="Để trống để chạy ngay khi worker sẵn sàng."><DatePicker showTime format="DD/MM/YYYY HH:mm:ss" /></Form.Item></Form>
    </Modal>
  </div>;
}
