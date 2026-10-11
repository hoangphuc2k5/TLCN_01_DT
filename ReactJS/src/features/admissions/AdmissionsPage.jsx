import { useEffect, useState } from 'react';
import { Button, DatePicker, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { createUserApi, getAdmissionsApi, getClassesApi, reviewAdmissionApi } from '../../services/api.service';

const STATUS_COLORS = {
  SUBMITTED: 'gold',
  UNDER_REVIEW: 'blue',
  ACCEPTED: 'green',
  REJECTED: 'red',
};

const STATUS_LABELS = {
  SUBMITTED: 'Đã nộp',
  UNDER_REVIEW: 'Đang xét duyệt',
  ACCEPTED: 'Nhận học',
  REJECTED: 'Từ chối',
};

const AdmissionsPage = () => {
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewStatus, setReviewStatus] = useState(null);
  const [enrollTarget, setEnrollTarget] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [form] = Form.useForm();
  const [enrollForm] = Form.useForm();

  const load = async () => {
    const [r, c] = await Promise.all([getAdmissionsApi(), getClassesApi()]);
    if (r?.EC === 0) setRows(r.data || []);
    if (c?.EC === 0) setClasses(c.data || []);
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
    const clean = (row.trackingCode || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const gradeClasses = classes.filter((c) => !row.requestedGrade || c.gradeLevel === row.requestedGrade);
    enrollForm.setFieldsValue({
      name: row.applicantName,
      dateOfBirth: row.dateOfBirth ? dayjs(row.dateOfBirth) : undefined,
      phone: row.guardianPhone,
      email: `hs.${clean || Date.now()}@school.edu.vn`,
      classId: gradeClasses[0]?._id || classes[0]?._id,
    });
    setEnrollTarget(row);
  };

  const submitEnroll = async (values) => {
    setEnrolling(true);
    try {
      const payload = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        role: 'STUDENT',
        classId: values.classId,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.toISOString() : undefined,
      };
      const res = await createUserApi(payload);
      if (res?.EC === 0) {
        message.success(`Đã tạo học sinh "${values.name}" thành công và phân vào lớp!`);
        setEnrollTarget(null);
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
    <div>
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
                {r.status === 'ACCEPTED' && (
                  <Button
                    size="small"
                    type="primary"
                    style={{ background: '#2e7d32', borderColor: '#2e7d32' }}
                    onClick={() => openEnroll(r)}
                  >
                    Tạo tài khoản học sinh
                  </Button>
                )}
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
          <Form.Item name="email" label="Email đăng nhập" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="hs.xxx@school.edu.vn" />
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
    </div>
  );
};

export default AdmissionsPage;
