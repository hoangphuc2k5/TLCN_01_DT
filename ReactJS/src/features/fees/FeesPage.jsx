import { useCallback, useEffect, useState } from 'react';
import { Button, Form, Space, Table, Tag, message } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import {
  createOnlinePaymentApi,
  getAcademicYearsApi,
  getClassesApi,
  getFeesApi,
  getUserDirectoryApi,
  runFeeRemindersApi,
  downloadExport,
} from '../../services/api.service';
import ImportExcelButton from '../../components/ImportExcelButton';
import { ROLES } from '../../constants/roles';
import { can, canExport } from '../../utils/permissions';
import { enumLabel } from '../../utils/enum-labels';
import { FeeInvoiceModal, FeePaymentModal, FeeReceiptModal, feeCategoryOptions, feeStatusColor } from './FeeModals';

const money = value => Number(value || 0).toLocaleString('vi-VN');

const FeesPage = () => {
  const { user } = useSelector((s) => s.auth);
  const canManage = can(user, 'fees', 'create');
  const canOnline = can(user, 'online_payments', 'create');
  const canRemind = can(user, 'fees', 'execute');
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [openFee, setOpenFee] = useState(false);
  const [targetScope, setTargetScope] = useState('STUDENT');
  const [openPay, setOpenPay] = useState(false);
  const [selected, setSelected] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [receiptModal, setReceiptModal] = useState({ open: false, invoice: null });
  const [feeForm] = Form.useForm();
  const [payForm] = Form.useForm();

  const load = useCallback(async () => {
    const res = await getFeesApi();
    if (res?.EC === 0) setRows(res.data || []);
  }, []);

  useEffect(() => {
    (async () => {
      if (canManage) {
        const [u, y, c] = await Promise.all([
          getUserDirectoryApi({ role: ROLES.STUDENT }),
          getAcademicYearsApi(),
          getClassesApi(),
        ]);
        if (u?.EC === 0) setStudents(u.data || []);
        if (y?.EC === 0) setYears(y.data || []);
        if (c?.EC === 0) setClasses(c.data || []);
      }
      load();
    })();
  }, [canManage, load]);

  return (
    <div>
      {(canManage || canExport(user, 'fees')) && (
        <Space style={{ marginBottom: 16 }}>
          {canManage && <Button type="primary" onClick={() => {
            feeForm.resetFields();
            feeForm.setFieldsValue({ lineItems: [{ category: 'TUITION', quantity: 1 }] });
            setOpenFee(true);
          }}>
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
        expandable={{
          rowExpandable: row => (row.lineItems || []).length > 0,
          expandedRowRender: row => <Table
            size="small"
            rowKey={item => item._id || `${item.code}-${item.name}`}
            pagination={false}
            dataSource={row.lineItems || []}
            columns={[
              { title: 'Mã', dataIndex: 'code', render: value => value || '-' },
              { title: 'Khoản thu', dataIndex: 'name' },
              { title: 'Loại', dataIndex: 'category', render: value => feeCategoryOptions.find(item => item.value === value)?.label || value },
              { title: 'SL', dataIndex: 'quantity' },
              { title: 'Đơn giá', dataIndex: 'unitAmount', render: money },
              { title: 'Thành tiền', dataIndex: 'amount', render: money },
              { title: 'Đã thu', dataIndex: 'paidAmount', render: money },
              { title: 'Trạng thái', dataIndex: 'status', render: value => <Tag color={feeStatusColor[value]}>{enumLabel(value)}</Tag> },
            ]}
          />,
        }}
        columns={[
          { title: 'Học sinh', render: (_, r) => r.studentId?.name },
          { title: 'Nội dung', dataIndex: 'title' },
          { title: 'Số mục', render: (_, r) => r.lineItems?.length || 1 },
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
            render: (v) => <Tag color={feeStatusColor[v]}>{enumLabel(v)}</Tag>,
          },
          (canManage || canOnline)
            ? {
                title: 'Thao tác',
                render: (_, r) => (
                  <Space size="small">
                    {r.status !== 'PAID' && canManage && (
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
                    )}
                    {r.status !== 'PAID' && canOnline && (
                      <Button
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
                            if (res?.EC === 0 && res.data?.checkoutUrl) {
                              window.location.assign(res.data.checkoutUrl);
                            } else {
                              message.error(res?.EM || 'Không tạo được giao dịch');
                            }
                          } catch { message.error('Không kết nối được cổng thanh toán'); }
                          finally { setPayingId(null); }
                        }}
                      >
                        Thanh toán VNPay
                      </Button>
                    )}
                    {r.paidAmount > 0 && (
                      <Button
                        size="small"
                        icon={<PrinterOutlined />}
                        onClick={() => setReceiptModal({ open: true, invoice: r })}
                      >
                        Biên lai
                      </Button>
                    )}
                  </Space>
                ),
              }
            : {},
        ].filter((c) => c.title)}
      />

      <FeeInvoiceModal
        openFee={openFee}
        setOpenFee={setOpenFee}
        feeForm={feeForm}
        targetScope={targetScope}
        setTargetScope={setTargetScope}
        classes={classes}
        students={students}
        years={years}
        load={load}
      />
      <FeePaymentModal
        openPay={openPay}
        setOpenPay={setOpenPay}
        selected={selected}
        payForm={payForm}
        load={load}
      />

      <FeeReceiptModal receiptModal={receiptModal} setReceiptModal={setReceiptModal} />
    </div>
  );
};

export default FeesPage;
