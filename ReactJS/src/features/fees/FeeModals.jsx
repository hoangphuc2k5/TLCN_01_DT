import { Button, Card, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tag, message } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { createFeeApi, getClassStudentsApi, recordPaymentApi } from '../../services/api.service';
import { Radio } from 'antd';
import { enumLabel } from '../../utils/enum-labels';

export const feeStatusColor = { UNPAID: 'red', PARTIAL: 'orange', PAID: 'green', OVERDUE: 'magenta' };
export const feeCategoryOptions = [
  { value: 'TUITION', label: 'Học phí' },
  { value: 'OTHER', label: 'Khoản thu khác' },
  { value: 'BOARDING', label: 'Bán trú' },
  { value: 'TRANSPORT', label: 'Xe đưa đón' },
  { value: 'ACTIVITY', label: 'Hoạt động' },
];

export const FeeInvoiceModal = ({ openFee, setOpenFee, feeForm, targetScope, setTargetScope, classes, students, years, load }) => (
      <Modal
        open={openFee}
        title="Tạo hóa đơn"
        onCancel={() => setOpenFee(false)}
        onOk={() => feeForm.submit()}
        width={720}
      >
        <Form
          form={feeForm}
          layout="vertical"
          initialValues={{ targetScope: 'STUDENT', lineItems: [{ category: 'TUITION', quantity: 1 }] }}
          onFinish={async (v) => {
            if (v.targetScope === 'CLASS') {
              const stRes = await getClassStudentsApi(v.classId);
              const classStudents = stRes?.data || [];
              if (!classStudents.length) {
                return message.warning('Lớp học này chưa có học sinh nào');
              }
              let successCount = 0;
              for (const st of classStudents) {
                const res = await createFeeApi({ ...v, studentId: st._id });
                if (res?.EC === 0) successCount += 1;
              }
              message.success(`Đã tạo hóa đơn cho ${successCount}/${classStudents.length} học sinh`);
              setOpenFee(false);
              feeForm.resetFields();
              load();
            } else {
              const res = await createFeeApi(v);
              if (res?.EC === 0) {
                message.success(res.EM || 'Tạo hóa đơn thành công');
                setOpenFee(false);
                feeForm.resetFields();
                load();
              } else message.error(res?.EM);
            }
          }}
        >
          <Form.Item name="targetScope" label="Đối tượng áp dụng" initialValue="STUDENT">
            <Radio.Group onChange={(e) => setTargetScope(e.target.value)}>
              <Radio.Button value="STUDENT">Theo cá nhân</Radio.Button>
              <Radio.Button value="CLASS">Cả lớp học</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {targetScope === 'CLASS' ? (
            <Form.Item name="classId" label="Lớp học" rules={[{ required: true, message: 'Vui lòng chọn lớp' }]}>
              <Select placeholder="Chọn lớp áp dụng" options={classes.map((c) => ({ value: c._id, label: c.name }))} />
            </Form.Item>
          ) : (
            <Form.Item name="studentId" label="Học sinh" rules={[{ required: true, message: 'Vui lòng chọn học sinh' }]}>
              <Select
                placeholder="Chọn học sinh"
                showSearch
                optionFilterProp="label"
                options={students.map((s) => ({ value: s._id, label: s.name }))}
              />
            </Form.Item>
          )}

          <Form.Item name="academicYearId" label="Năm học" rules={[{ required: true, message: 'Chọn năm học' }]}>
            <Select placeholder="Chọn năm học" options={years.map((y) => ({ value: y._id, label: y.name }))} />
          </Form.Item>
          <Form.Item name="title" label="Nội dung" rules={[{ required: true, message: 'Nhập nội dung' }]}>
            <Input placeholder="VD: Học phí Học kỳ 1, Tiền bán trú tháng 9..." />
          </Form.Item>
          <Form.Item name="description" label="Chi tiết"><Input.TextArea maxLength={1000} /></Form.Item>
          <Form.List
            name="lineItems"
            rules={[{ validator: async (_, items) => { if (!items?.length) throw new Error('Cần ít nhất một khoản thu'); } }]}
          >
            {(fields, { add, remove }, { errors }) => <Space direction="vertical" style={{ width: '100%' }}>
              {fields.map(({ key, name, ...rest }) => <Card
                key={key}
                size="small"
                title={`Khoản thu ${name + 1}`}
                extra={<Button danger size="small" disabled={fields.length === 1} onClick={() => remove(name)}>Xóa</Button>}
              >
                <Space align="start" wrap>
                  <Form.Item {...rest} name={[name, 'code']} label="Mã"><Input maxLength={50} style={{ width: 110 }} /></Form.Item>
                  <Form.Item {...rest} name={[name, 'name']} label="Tên khoản" rules={[{ required: true, whitespace: true }]}><Input maxLength={200} style={{ width: 220 }} /></Form.Item>
                  <Form.Item {...rest} name={[name, 'category']} label="Loại" rules={[{ required: true }]}><Select options={feeCategoryOptions} style={{ width: 150 }} /></Form.Item>
                  <Form.Item {...rest} name={[name, 'quantity']} label="Số lượng" rules={[{ required: true }]}><InputNumber min={0.01} style={{ width: 100 }} /></Form.Item>
                  <Form.Item {...rest} name={[name, 'unitAmount']} label="Đơn giá" rules={[{ required: true }]}><InputNumber min={1} step={1000} style={{ width: 160 }} /></Form.Item>
                </Space>
                <Form.Item {...rest} name={[name, 'description']} label="Mô tả"><Input maxLength={500} /></Form.Item>
              </Card>)}
              <Button type="dashed" onClick={() => add({ category: 'TUITION', quantity: 1 })}>Thêm khoản thu</Button>
              <Form.ErrorList errors={errors} />
            </Space>}
          </Form.List>
          <Form.Item name="dueDate" label="Hạn thanh toán" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>
);

export const FeePaymentModal = ({ openPay, setOpenPay, selected, payForm, load }) => (
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
);

export const FeeReceiptModal = ({ receiptModal, setReceiptModal }) => (
      <Modal
        open={receiptModal.open}
        title={null}
        footer={[
          <Button key="close" onClick={() => setReceiptModal({ open: false, invoice: null })}>
            Đóng
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => window.print()}
          >
            In phiếu thu
          </Button>,
        ]}
        onCancel={() => setReceiptModal({ open: false, invoice: null })}
        width={680}
      >
        {receiptModal.invoice && (
          <div style={{ padding: '16px 8px', color: '#1f1f1f', fontFamily: 'sans-serif' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: '#595959' }}>
                HỆ THỐNG GIÁO DỤC EDUMOET
              </div>
              <h2 style={{ margin: '8px 0 4px 0', color: '#0f4c5c', textTransform: 'uppercase' }}>
                PHIẾU THU TIỀN HỌC PHÍ
              </h2>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                Mã biên lai: <strong>REC-{receiptModal.invoice._id?.slice(-8).toUpperCase()}</strong> · Ngày lập: {dayjs(receiptModal.invoice.updatedAt || receiptModal.invoice.createdAt).format('DD/MM/YYYY HH:mm')}
              </div>
            </div>

            <div style={{ background: '#fafafa', padding: 14, borderRadius: 6, marginBottom: 16 }}>
              <Row gutter={[16, 8]}>
                <Col span={14}>
                  <div>Họ tên học sinh: <strong>{receiptModal.invoice.studentId?.name || 'Học sinh'}</strong></div>
                  <div>Mã học sinh: <strong>{receiptModal.invoice.studentId?.code || '—'}</strong></div>
                </Col>
                <Col span={10}>
                  <div>Nội dung thu: <strong>{receiptModal.invoice.title}</strong></div>
                  <div>Trạng thái: <Tag color={feeStatusColor[receiptModal.invoice.status]}>{enumLabel(receiptModal.invoice.status)}</Tag></div>
                </Col>
              </Row>
            </div>

            <Table
              size="small"
              pagination={false}
              dataSource={receiptModal.invoice.lineItems?.length ? receiptModal.invoice.lineItems : [{ name: receiptModal.invoice.title, amount: receiptModal.invoice.amount, paidAmount: receiptModal.invoice.paidAmount }]}
              rowKey={(item, idx) => item._id || idx}
              columns={[
                { title: 'STT', render: (_, __, i) => i + 1, width: 50 },
                { title: 'Khoản thu', dataIndex: 'name' },
                { title: 'Số tiền phải nộp', dataIndex: 'amount', render: v => Number(v || 0).toLocaleString('vi-VN') + ' đ' },
                { title: 'Đã thanh toán', dataIndex: 'paidAmount', render: v => <strong style={{ color: '#2e7d32' }}>{Number(v || receiptModal.invoice.paidAmount || 0).toLocaleString('vi-VN')} đ</strong> },
              ]}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ background: '#f6ffed' }}>
                    <Table.Summary.Cell index={0} colSpan={2}>
                      <strong>TỔNG TIỀN ĐÃ THU</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} colSpan={2}>
                      <strong style={{ color: '#2e7d32', fontSize: 16 }}>
                        {Number(receiptModal.invoice.paidAmount || 0).toLocaleString('vi-VN')} VNĐ
                      </strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, textAlign: 'center', padding: '0 24px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Người nộp tiền</div>
                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>(Ký và ghi rõ họ tên)</div>
                <div style={{ height: 48 }} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Người lập phiếu / Thủ quỹ</div>
                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>(Đã xác thực điện tử)</div>
                <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Tag color="success">ĐÃ XÁC NHẬN</Tag>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
);
