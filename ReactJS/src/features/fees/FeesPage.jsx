import { useEffect, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import {
  createFeeApi,
  getAcademicYearsApi,
  getFeesApi,
  getUsersApi,
  recordPaymentApi,
  downloadExport,
} from '../../api';
import ImportExcelButton from '../../components/ImportExcelButton';
import { ROLES } from '../../constants/roles';

const statusColor = {
  UNPAID: 'red',
  PARTIAL: 'orange',
  PAID: 'green',
  OVERDUE: 'magenta',
};

const FeesPage = () => {
  const { user } = useSelector((s) => s.auth);
  const canManage = [ROLES.ACCOUNTANT, ROLES.SCHOOL_ADMIN].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [years, setYears] = useState([]);
  const [openFee, setOpenFee] = useState(false);
  const [openPay, setOpenPay] = useState(false);
  const [selected, setSelected] = useState(null);
  const [feeForm] = Form.useForm();
  const [payForm] = Form.useForm();

  const load = async () => {
    const res = await getFeesApi();
    if (res?.EC === 0) setRows(res.data || []);
  };

  useEffect(() => {
    (async () => {
      if (canManage) {
        const [u, y] = await Promise.all([
          getUsersApi({ role: ROLES.STUDENT }),
          getAcademicYearsApi(),
        ]);
        if (u?.EC === 0) setStudents(u.data || []);
        if (y?.EC === 0) setYears(y.data || []);
      }
      load();
    })();
  }, []);

  return (
    <div>
      {canManage && (
        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" onClick={() => setOpenFee(true)}>
            Tạo hóa đơn
          </Button>
          <ImportExcelButton type="fees" onDone={load} />
          <Button
            onClick={async () => {
              try {
                await downloadExport('fees');
              } catch {
                message.error('Xuất Excel thất bại');
              }
            }}
          >
            Xuất Excel
          </Button>
        </Space>
      )}
      <Table
        rowKey="_id"
        dataSource={rows}
        columns={[
          { title: 'Học sinh', render: (_, r) => r.studentId?.name },
          { title: 'Nội dung', dataIndex: 'title' },
          {
            title: 'Số tiền',
            dataIndex: 'amount',
            render: (v) => Number(v).toLocaleString('vi-VN'),
          },
          {
            title: 'Đã thu',
            dataIndex: 'paidAmount',
            render: (v) => Number(v).toLocaleString('vi-VN'),
          },
          {
            title: 'Hạn',
            dataIndex: 'dueDate',
            render: (v) => dayjs(v).format('DD/MM/YYYY'),
          },
          {
            title: 'TT',
            dataIndex: 'status',
            render: (v) => <Tag color={statusColor[v]}>{v}</Tag>,
          },
          canManage
            ? {
                title: 'Thao tác',
                render: (_, r) =>
                  r.status !== 'PAID' ? (
                    <Button
                      size="small"
                      onClick={() => {
                        setSelected(r);
                        payForm.resetFields();
                        setOpenPay(true);
                      }}
                    >
                      Thu tiền
                    </Button>
                  ) : null,
              }
            : {},
        ].filter((c) => c.title)}
      />

      <Modal open={openFee} title="Tạo hóa đơn" onCancel={() => setOpenFee(false)} onOk={() => feeForm.submit()}>
        <Form
          form={feeForm}
          layout="vertical"
          onFinish={async (v) => {
            const res = await createFeeApi(v);
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpenFee(false);
              feeForm.resetFields();
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="studentId" label="Học sinh" rules={[{ required: true }]}>
            <Select options={students.map((s) => ({ value: s._id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="academicYearId" label="Năm học" rules={[{ required: true }]}>
            <Select options={years.map((y) => ({ value: y._id, label: y.name }))} />
          </Form.Item>
          <Form.Item name="title" label="Nội dung" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="amount" label="Số tiền" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="dueDate" label="Hạn thanh toán" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={openPay}
        title={`Thu tiền — ${selected?.title || ''}`}
        onCancel={() => setOpenPay(false)}
        onOk={() => payForm.submit()}
      >
        <Form
          form={payForm}
          layout="vertical"
          onFinish={async (v) => {
            const res = await recordPaymentApi({
              invoiceId: selected._id,
              amount: v.amount,
              method: v.method,
              note: v.note,
            });
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpenPay(false);
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="amount" label="Số tiền" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>
          <Form.Item name="method" label="Hình thức" initialValue="CASH">
            <Select
              options={[
                { value: 'CASH', label: 'Tiền mặt' },
                { value: 'TRANSFER', label: 'Chuyển khoản' },
                { value: 'ONLINE', label: 'Online' },
              ]}
            />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FeesPage;
