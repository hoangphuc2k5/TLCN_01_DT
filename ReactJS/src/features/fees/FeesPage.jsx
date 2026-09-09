import { useEffect, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import {
  createFeeApi,
  createOnlinePaymentApi,
  getAcademicYearsApi,
  getFeesApi,
  getUserDirectoryApi,
  recordPaymentApi,
  runFeeRemindersApi,
  downloadExport,
} from '../../api';
import ImportExcelButton from '../../components/ImportExcelButton';
import { ROLES } from '../../constants/roles';
import { can, canExport } from '../../util/permissions';

const statusColor = {
  UNPAID: 'red',
  PARTIAL: 'orange',
  PAID: 'green',
  OVERDUE: 'magenta',
};

const FeesPage = () => {
  const { user } = useSelector((s) => s.auth);
  const canManage = can(user, 'fees', 'create');
  const canOnline = can(user, 'online_payments', 'create');
  const canRemind = can(user, 'fees', 'execute');
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [years, setYears] = useState([]);
  const [openFee, setOpenFee] = useState(false);
  const [openPay, setOpenPay] = useState(false);
  const [selected, setSelected] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [checkout, setCheckout] = useState(null);
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
          getUserDirectoryApi({ role: ROLES.STUDENT }),
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
      {(canManage || canExport(user, 'fees')) && (
        <Space style={{ marginBottom: 16 }}>
          {canManage && <Button type="primary" onClick={() => setOpenFee(true)}>
            Tạo hóa đơn
          </Button>}
          {canManage && can(user, 'fees', 'update') && <ImportExcelButton type="fees" onDone={load} />}
          {canExport(user, 'fees') && <Button
            onClick={async () => {
              try {
                await downloadExport('fees');
              } catch {
                message.error('Xuất Excel thất bại');
              }
            }}
          >
            Xuất Excel
          </Button>}
          {canRemind && <Button onClick={async () => { const res = await runFeeRemindersApi(); if (res?.EC === 0) message.success(`Đã gửi ${res.data.notifications} thông báo`); else message.error(res?.EM); }}>Nhắc nợ</Button>}
        </Space>
      )}
      <Table
        rowKey="_id"
        dataSource={rows}
        columns={[
          { title: 'Học sinh', render: (_, r) => r.studentId?.name },
          { title: 'Nội dung', dataIndex: 'title' },
          { title: 'Loại', dataIndex: 'category' },
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
          (canManage || canOnline)
            ? {
                title: 'Thao tác',
                render: (_, r) => r.status !== 'PAID' ? (
                  <Space size="small">
                    {canManage && <Button
                      size="small"
                      onClick={() => {
                        setSelected(r);
                        payForm.resetFields();
                        setOpenPay(true);
                      }}
                    >
                      Thu tien
                    </Button>}
                    {canOnline && <Button
                      size="small"
                      type="primary"
                      loading={payingId === r._id}
                      disabled={!!payingId}
                      onClick={async () => {
                        setPayingId(r._id);
                        try {
                          const res = await createOnlinePaymentApi({
                            invoiceId: r._id,
                            provider: 'VNPAY',
                          });
                          if (res?.EC === 0) setCheckout(res.data);
                          else message.error(res?.EM || 'Không tạo được giao dịch');
                        } catch { message.error('Không kết nối được cổng thanh toán'); }
                        finally { setPayingId(null); }
                      }}
                    >
                      Thanh toán VNPay
                    </Button>}
                  </Space>
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
          <Form.Item name="category" label="Loại khoản thu" initialValue="TUITION">
            <Select options={[{ value: 'TUITION', label: 'Học phí' }, { value: 'OTHER', label: 'Khoản thu khác' }, { value: 'BOARDING', label: 'Bán trú' }, { value: 'TRANSPORT', label: 'Xe đưa đón' }, { value: 'ACTIVITY', label: 'Hoạt động' }]} />
          </Form.Item>
          <Form.Item name="description" label="Chi tiết"><Input.TextArea maxLength={1000} /></Form.Item>
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
              ]}
            />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={!!checkout} title="Thanh toán học phí qua VNPay" onCancel={() => setCheckout(null)} footer={null}>
        <p>Số tiền: {Number(checkout?.amount || 0).toLocaleString('vi-VN')} VND</p>
        <p>Mở VNPay để chọn ngân hàng và hoàn tất thanh toán.</p>
        {checkout?.checkoutUrl && <a href={checkout.checkoutUrl}>Mở cổng thanh toán VNPay</a>}
        <p style={{ marginTop: 12 }}>Mã giao dịch: {checkout?.providerOrderId}</p>
      </Modal>
    </div>
  );
};

export default FeesPage;
