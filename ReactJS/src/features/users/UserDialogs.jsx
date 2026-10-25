import { Button, DatePicker, Form, Input, Modal, Popconfirm, Select, message } from 'antd';
import { updateUserApi } from '../../services/api/administration.api';

const UserDialogs = ({ open, setOpen, editing, form, onSubmit, onResetPassword, roleOptions, transferStudent, setTransferStudent, transferring, setTransferring, transferForm, transferClasses, load }) => (
  <>
      <Modal
        open={open}
        title={editing ? 'Cập nhật người dùng' : 'Thêm người dùng'}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item name="name" label="Họ tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="ten@truong.edu.vn hoặc ten@gmail.com" />
          </Form.Item>
          {!editing && (
            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[{ required: true, min: 6 }]}
              extra="Mật khẩu mới cần ít nhất 15 ký tự, tối đa 72 byte UTF-8. Khi sửa có thể tạo mật khẩu tạm riêng."
            >
              <Input.Password />
            </Form.Item>
          )}
          {editing && (
            <Popconfirm
              title="Tạo mật khẩu tạm mới?"
              description="Thu hồi phiên cũ và buộc đổi mật khẩu khi đăng nhập. 2FA được giữ nguyên."
              onConfirm={() => onResetPassword(editing._id)}
            >
              <Button style={{ marginBottom: 16 }}>Tạo mật khẩu tạm</Button>
            </Popconfirm>
          )}
          <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
            <Select options={roleOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="code" label="Mã">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Điện thoại">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ">
            <Input />
          </Form.Item>
          <Form.Item name="gender" label="Giới tính">
            <Select
              allowClear
              options={[
                { value: 'Male', label: 'Nam' },
                { value: 'Female', label: 'Nữ' },
                { value: 'Other', label: 'Khác' },
              ]}
            />
          </Form.Item>
          <Form.Item name="dateOfBirth" label="Ngày sinh">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="bio" label="Giới thiệu">
            <Input.TextArea rows={2} />
          </Form.Item>
          {editing && (
            <Form.Item name="status" label="Trạng thái">
              <Select
                options={[
                  { value: 'ACTIVE', label: 'ACTIVE' },
                  { value: 'INACTIVE', label: 'INACTIVE' },
                  { value: 'SUSPENDED', label: 'SUSPENDED' },
                ]}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
      <Modal open={!!transferStudent} title={`Chuyển lớp — ${transferStudent?.name || ''}`} okText="Xác nhận chuyển lớp" cancelText="Hủy" confirmLoading={transferring} onCancel={() => !transferring && setTransferStudent(null)} onOk={() => transferForm.submit()}>
        <p>Chuyển có hiệu lực ngay. Điểm của học kỳ được chọn trong năm học lớp đích được bàn giao và giữ bản sao trước chuyển; học kỳ khác giữ nguyên.</p>
        <Form form={transferForm} layout="vertical" onFinish={async values => {
          setTransferring(true);
          try {
            const result = await updateUserApi(transferStudent._id, values);
            if (result?.EC !== 0) return message.error(result?.EM);
            message.success('Đã chuyển lớp và lưu lịch sử'); setTransferStudent(null); load();
          } catch (error) { message.error(error.message); } finally { setTransferring(false); }
        }}>
          <Form.Item name="classId" label="Lớp đích" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={transferClasses.map(cls => ({ value: cls._id, label: `${cls.name} — ${cls.academicYearId?.name || ''}` }))} /></Form.Item>
          <Form.Item name="transferSemester" label="Học kỳ bàn giao điểm" rules={[{ required: true }]}><Select options={[{ value: 1, label: 'Học kỳ 1' }, { value: 2, label: 'Học kỳ 2' }]} /></Form.Item>
          <Form.Item name="transferReason" label="Lý do" rules={[{ required: true, whitespace: true, max: 1000 }]}><Input.TextArea maxLength={1000} /></Form.Item>
        </Form>
        {(transferStudent?.classHistory || []).map(item => <p key={item._id}>{item.fromClassName || 'Chưa có lớp'} → {item.toClassName} ({item.academicYearName}, HK{item.semester}) — {item.reason}</p>)}
      </Modal>
  </>
);

export default UserDialogs;
