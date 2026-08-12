import { useEffect } from 'react';
import { Button, Form, Input, Select, message, Descriptions, Card } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfileApi } from '../../api';
import { fetchAccountThunk } from '../../Redux/authSlice';
import { ROLE_LABELS } from '../../constants/roles';

const ProfilePage = () => {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const [form] = Form.useForm();

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        name: user.name,
        phone: user.phone,
        address: user.address,
        bio: user.bio,
        gender: user.gender,
      });
    }
  }, [user, form]);

  return (
    <div>
      <Card title="Thông tin tài khoản" style={{ marginBottom: 16 }}>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Email">{user?.email}</Descriptions.Item>
          <Descriptions.Item label="Vai trò">{ROLE_LABELS[user?.role] || user?.role}</Descriptions.Item>
          <Descriptions.Item label="Mã">{user?.code || '—'}</Descriptions.Item>
          <Descriptions.Item label="Trường">
            {user?.schoolId?.name || '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      <Card title="Cập nhật hồ sơ">
        <Form
          form={form}
          layout="vertical"
          style={{ maxWidth: 480 }}
          onFinish={async (v) => {
            const res = await updateProfileApi(v);
            if (res?.EC === 0) {
              message.success(res.EM);
              dispatch(fetchAccountThunk());
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="name" label="Họ tên" rules={[{ required: true }]}>
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
              options={[
                { value: 'Male', label: 'Nam' },
                { value: 'Female', label: 'Nữ' },
                { value: 'Other', label: 'Khác' },
              ]}
            />
          </Form.Item>
          <Form.Item name="bio" label="Giới thiệu">
            <Input.TextArea />
          </Form.Item>
          <Button type="primary" htmlType="submit">
            Lưu
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default ProfilePage;
