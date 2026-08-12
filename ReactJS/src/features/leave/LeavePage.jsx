import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { createLeaveApi, getLeavesApi, reviewLeaveApi } from '../../api';
import { ROLES } from '../../constants/roles';

const TYPE_LABELS = {
  STUDENT_ABSENCE: 'Xin nghỉ học',
  TEACHER_ABSENCE: 'Xin nghỉ dạy / nghỉ phép',
  MAKEUP_CLASS: 'Đề xuất dạy bù',
};

const leaveTypeOptionsByRole = (role) => {
  switch (role) {
    case ROLES.STUDENT:
    case ROLES.PARENT:
      return [{ value: 'STUDENT_ABSENCE', label: 'Xin nghỉ học' }];
    case ROLES.SUBJECT_TEACHER:
    case ROLES.HOMEROOM_TEACHER:
      return [
        { value: 'TEACHER_ABSENCE', label: 'Xin nghỉ dạy' },
        { value: 'MAKEUP_CLASS', label: 'Đề xuất dạy bù' },
      ];
    case ROLES.ACADEMIC_AFFAIRS:
    case ROLES.SCHOOL_ADMIN:
    case ROLES.ACCOUNTANT:
    case ROLES.LIBRARIAN:
      return [{ value: 'TEACHER_ABSENCE', label: 'Xin nghỉ phép' }];
    default:
      return [];
  }
};

const LeavePage = () => {
  const { user } = useSelector((s) => s.auth);
  const canReview = [
    ROLES.SCHOOL_ADMIN,
    ROLES.ACADEMIC_AFFAIRS,
    ROLES.HOMEROOM_TEACHER,
    ROLES.CLUSTER_ADMIN,
  ].includes(user?.role);
  const typeOptions = useMemo(() => leaveTypeOptionsByRole(user?.role), [user?.role]);
  const canCreate = typeOptions.length > 0;
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(typeOptions[0]?.value);
  const [form] = Form.useForm();

  const load = async () => {
    const res = await getLeavesApi();
    if (res?.EC === 0) setRows(res.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const childrenOptions = (user?.parentOf || []).map((c) => ({
    value: typeof c === 'object' ? c._id : c,
    label: typeof c === 'object' ? c.name : c,
  }));

  return (
    <div>
      {canCreate && (
        <Button
          type="primary"
          style={{ marginBottom: 16 }}
          onClick={() => {
            const defaultType = typeOptions[0]?.value;
            setSelectedType(defaultType);
            form.resetFields();
            form.setFieldsValue({ type: defaultType });
            setOpen(true);
          }}
        >
          Gửi đơn
        </Button>
      )}
      <Table
        rowKey="_id"
        dataSource={rows}
        columns={[
          {
            title: 'Loại',
            dataIndex: 'type',
            render: (v) => TYPE_LABELS[v] || v,
          },
          { title: 'Người gửi', render: (_, r) => r.requesterId?.name },
          { title: 'Học sinh', render: (_, r) => r.studentId?.name || '—' },
          { title: 'Lý do', dataIndex: 'reason' },
          {
            title: 'Từ ngày',
            dataIndex: 'fromDate',
            render: (v) => dayjs(v).format('DD/MM/YYYY'),
          },
          {
            title: 'Đến ngày',
            dataIndex: 'toDate',
            render: (v) => dayjs(v).format('DD/MM/YYYY'),
          },
          {
            title: 'TT',
            dataIndex: 'status',
            render: (v) => (
              <Tag color={v === 'APPROVED' ? 'green' : v === 'REJECTED' ? 'red' : 'gold'}>{v}</Tag>
            ),
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
                          const res = await reviewLeaveApi(r._id, { status: 'APPROVED' });
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
                          const res = await reviewLeaveApi(r._id, { status: 'REJECTED' });
                          if (res?.EC === 0) {
                            message.success(res.EM);
                            load();
                          } else message.error(res?.EM);
                        }}
                      >
                        Từ chối
                      </Button>
                    </Space>
                  ) : null,
              }
            : {},
        ].filter((c) => c.title)}
      />
      <Modal open={open} title="Gửi đơn từ" onCancel={() => setOpen(false)} onOk={() => form.submit()}>
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            const res = await createLeaveApi(v);
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpen(false);
              form.resetFields();
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="type" label="Loại đơn" rules={[{ required: true }]}>
            <Select
              options={typeOptions}
              onChange={(v) => setSelectedType(v)}
              disabled={typeOptions.length <= 1}
            />
          </Form.Item>
          {user?.role === ROLES.PARENT && (
            <Form.Item name="studentId" label="Con em" rules={[{ required: true }]}>
              <Select options={childrenOptions} />
            </Form.Item>
          )}
          <Form.Item name="reason" label="Lý do" rules={[{ required: true }]}>
            <Input.TextArea />
          </Form.Item>
          {selectedType === 'MAKEUP_CLASS' && (
            <Form.Item
              name="makeupProposal"
              label="Đề xuất dạy bù (ngày / tiết / phòng)"
              rules={[{ required: true }]}
            >
              <Input.TextArea placeholder="Ví dụ: Thứ 5 tuần sau, tiết 3-4, phòng 201" />
            </Form.Item>
          )}
          <Form.Item name="fromDate" label="Từ ngày" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="toDate" label="Đến ngày" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LeavePage;
