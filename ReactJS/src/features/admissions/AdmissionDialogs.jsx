import { DatePicker, Form, Input, Modal, Select } from 'antd';

const AdmissionDialogs = ({ reviewTarget, reviewModalTitle, reviewStatus, setReviewTarget, form, submitReview, enrollTarget, setEnrollTarget, enrolling, enrollForm, submitEnroll, classes }) => (
  <>
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
  </>
);

export default AdmissionDialogs;
