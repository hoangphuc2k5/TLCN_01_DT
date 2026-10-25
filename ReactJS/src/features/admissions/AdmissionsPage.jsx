import { useEffect, useState } from 'react';
import { Button, DatePicker, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { enrollAdmissionApi, getAdmissionsApi, getClassesApi, reviewAdmissionApi } from '../../services/api.service';
import PageShell from '../../components/layout/PageShell';

const STATUS_COLORS = {
  SUBMITTED: 'gold',
  UNDER_REVIEW: 'blue',
  ACCEPTED: 'green',
  REJECTED: 'red',
  WAITLISTED: 'orange',
};

const STATUS_LABELS = {
  SUBMITTED: 'Đã nộp',
  UNDER_REVIEW: 'Đang xét duyệt',
  ACCEPTED: 'Nhận học',
  REJECTED: 'Từ chối',
  WAITLISTED: 'Danh sách chờ',
};

const AdmissionsPage = () => {
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewStatus, setReviewStatus] = useState(null);
  const [enrollTarget, setEnrollTarget] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [enrollForm] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [r, c] = await Promise.all([getAdmissionsApi(), getClassesApi()]);
      if (r?.EC === 0) setRows(r.data || []);
      if (c?.EC === 0) setClasses(c.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openReview = (row, status) => {
    form.resetFields();
    setReviewTarget(row);
    setReviewStatus(status);
  };

  const submitReview = async (values) => {
    const r = await reviewAdmissionApi(reviewTarget._id, { status: reviewStatus, reviewNote: values.reviewNote || '' });
    if (r?.EC === 0) {
      message.success('Đã cập nhật kết quả xét tuyển');
      setReviewTarget(null);
      load();
    } else {
      message.error(r?.EM || 'Không thể cập nhật');
    }
  };

  const openEnroll = (row) => {
    enrollForm.resetFields();
    const clean = (row.trackingCode || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const cleanNum = (row.trackingCode || '').replace(/[^0-9]/g, '');
    const autoCode = `HS${dayjs().year()}-${cleanNum ? cleanNum.slice(-4) : clean ? clean.slice(-4) : Math.floor(1000 + Math.random() * 9000)}`;
    const gradeClasses = classes.filter((c) => !row.requestedGrade || c.gradeLevel === row.requestedGrade);
    enrollForm.setFieldsValue({
      name: row.applicantName,
      code: autoCode,
      dateOfBirth: row.dateOfBirth ? dayjs(row.dateOfBirth) : undefined,
      phone: row.guardianPhone,
        email: '',
      classId: gradeClasses[0]?._id || classes[0]?._id,
    });
    setEnrollTarget(row);
  };

  const submitEnroll = async (values) => {
    setEnrolling(true);
    try {
      const payload = {
        name: values.name,
        code: values.code,
        email: values.email,
        phone: values.phone,
        role: 'STUDENT',
        classId: values.classId,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.toISOString() : undefined,
      };
      const res = await enrollAdmissionApi(enrollTarget._id, payload);
      if (res?.EC === 0) {
        const temporaryPassword = res.data?.defaultPassword;
        if (temporaryPassword) {
          Modal.info({
            title: 'Đã tạo tài khoản học sinh',
            content: <div><p>Tài khoản: {values.email}</p><p>Mật khẩu tạm (chỉ hiển thị lần này): <Typography.Text copyable code>{temporaryPassword}</Typography.Text></p><p>Hãy gửi riêng mật khẩu cho học sinh và yêu cầu đổi sau khi đăng nhập.</p></div>,
          });
        } else message.success(`Hồ sơ đã được liên kết với tài khoản học sinh ${values.email}.`);
        setEnrollTarget(null);
        await load();
      } else {
        message.error(res?.EM || 'Không thể tạo tài khoản học sinh');
      }
    } finally {
      setEnrolling(false);
    }
  };

  const reviewModalTitle = {
    UNDER_REVIEW: 'Tiếp nhận hồ sơ',
    ACCEPTED: 'Nhận học',
    REJECTED: 'Từ chối hồ sơ',
  }[reviewStatus] || 'Xét duyệt';

  return (
    <PageShell
      title="Tuyển sinh"
      description="Theo dõi hồ sơ, lọc theo trạng thái và xử lý kết quả tuyển sinh."
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          style={{ width: 180 }}
          placeholder="Lọc theo trạng thái"
          allowClear
          options={[
            { value: 'SUBMITTED', label: 'Đã nộp' },
            { value: 'UNDER_REVIEW', label: 'Đang xét duyệt' },
            { value: 'ACCEPTED', label: 'Nhận học' },
            { value: 'REJECTED', label: 'Từ chối' },
            { value: 'WAITLISTED', label: 'Danh sách chờ' },
          ]}
          onChange={value =>
            getAdmissionsApi(value ? { status: value } : undefined)
              .then(r => r?.EC === 0 && setRows(r.data || []))
          }
        />
        <Input.Search
          placeholder="Tìm mã hồ sơ hoặc tên học sinh..."
          style={{ width: 280 }}
          allowClear
          onSearch={value => {
            const q = (value || '').trim().toLowerCase();
            if (!q) {
              load();
            } else {
              setRows(prev => prev.filter(r =>
                (r.trackingCode || '').toLowerCase().includes(q) ||
                (r.applicantName || '').toLowerCase().includes(q)
              ));
            }
          }}
        />
        <Button onClick={load}>Làm mới</Button>
      </Space>
      <Table
        rowKey="_id"
        loading={loading}
        dataSource={rows}
        columns={[
          { title: 'Mã hồ sơ', dataIndex: 'trackingCode' },
          { title: 'Học sinh', dataIndex: 'applicantName' },
          { title: 'Khối', dataIndex: 'requestedGrade' },
          { title: 'Ghi chú duyệt', dataIndex: 'reviewNote', render: v => v || '—' },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: v => <Tag color={STATUS_COLORS[v]}>{STATUS_LABELS[v] || v}</Tag>,
          },
          {
            title: 'Thao tác',
            render: (_, r) => (
              <Space>
                {r.status === 'SUBMITTED' && (
                  <Button size="small" onClick={() => openReview(r, 'UNDER_REVIEW')}>
                    Tiếp nhận
                  </Button>
                )}
                {['SUBMITTED', 'UNDER_REVIEW'].includes(r.status) && (
                  <>
                    <Button size="small" type="primary" onClick={() => openReview(r, 'ACCEPTED')}>
                      Nhận học
                    </Button>
                    <Button size="small" danger onClick={() => openReview(r, 'REJECTED')}>
                      Từ chối
                    </Button>
                  </>
                )}
                {r.status === 'ACCEPTED' && !r.enrolledStudentId && (
                  <Button
                    size="small"
                    type="primary"
                    style={{ background: '#2e7d32', borderColor: '#2e7d32' }}
                    onClick={() => openEnroll(r)}
                  >
                    Tạo tài khoản học sinh
                  </Button>
                )}
                {r.enrolledStudentId && <Tag color="green">Đã tạo: {r.enrolledStudentId.code || r.enrolledStudentId.email}</Tag>}
              </Space>
            ),
          },
        ]}
      />
      <Modal
        open={!!reviewTarget}
        title={reviewModalTitle}
        okText="Xác nhận"
        cancelText="Hủy"
        okButtonProps={{ danger: reviewStatus === 'REJECTED' }}
        onCancel={() => setReviewTarget(null)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={submitReview}>
          <Form.Item
            name="reviewNote"
            label="Ghi chú kết quả xét tuyển"
            rules={reviewStatus === 'REJECTED' ? [{ required: true, whitespace: true, message: 'Vui lòng nhập lý do từ chối' }] : []}
          >
            <Input.TextArea
              rows={3}
              maxLength={500}
              placeholder={reviewStatus === 'REJECTED' ? 'Bắt buộc nhập lý do từ chối...' : 'Ghi chú thêm (không bắt buộc)'}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!enrollTarget}
        title="Tiếp nhận học sinh mới & Phân lớp"
        okText="Tạo tài khoản"
        cancelText="Hủy"
        confirmLoading={enrolling}
        onCancel={() => setEnrollTarget(null)}
        onOk={() => enrollForm.submit()}
        width={560}
      >
        <Form form={enrollForm} layout="vertical" onFinish={submitEnroll}>
          <Form.Item name="name" label="Họ và tên học sinh" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="Mã số học sinh (Tự động sinh)" rules={[{ required: true, message: 'Nhập mã học sinh' }]}>
            <Input placeholder="HS2026-XXXX" />
          </Form.Item>
          <Form.Item name="email" label="Email đăng nhập của học sinh" rules={[{ required: true, type: 'email' }]} extra="Nhập email học sinh thực sự sử dụng để đăng nhập.">
            <Input placeholder="hoc.sinh@gmail.com" />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại liên hệ">
            <Input placeholder="Số điện thoại phụ huynh" />
          </Form.Item>
          <Form.Item name="dateOfBirth" label="Ngày sinh">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="classId" label="Lớp biên chế" rules={[{ required: true, message: 'Vui lòng chọn lớp học' }]}>
            <Select
              placeholder="Chọn lớp học"
              options={classes.map((c) => ({
                value: c._id,
                label: `${c.name} (Khối ${c.gradeLevel || '—'})`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
};

export default AdmissionsPage;
