import { Alert, Button, Card, Divider, Form, Input, Radio, Typography } from 'antd';
import { clearError, clearPhoneChallenge, logout, requestPhoneLoginThunk, verifyMfaThunk, verifyPhoneLoginThunk } from '../../store/auth.slice';
import logo from '../../Logo/icon.png';

const LoginPanel = ({ config, localError, error, challenge, loading, phoneChallenge, phoneMode, setPhoneMode, setLocalError, dispatch, navigate, onFinish, googleBtnRef, clientId, allowPassword, googleReady, googleRenderError }) => (

    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(145deg, #e8f1f2 0%, #f7f3e9 50%, #dce8e0 100%)',
        padding: 24,
      }}
    >
      <Card style={{ width: 420, borderRadius: 16 }} variant="borderless">
        <div style={{ textAlign: 'center' }}>
          <img
            src={logo}
            alt={`Logo ${config.appName || 'EduMoet'}`}
            style={{ width: 88, height: 88, objectFit: 'contain', marginBottom: 8 }}
          />
          <Typography.Title level={3} style={{ marginBottom: 4, color: '#0f4c5c' }}>
            {config.appName || 'EduMoet'}
          </Typography.Title>
        </div>
        <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>
          Đăng nhập bằng email và mật khẩu
        </Typography.Paragraph>

        {(localError || error) && (
          <Alert style={{ marginBottom: 16 }} type="error" message={localError || error} />
        )}

        {challenge && <Form layout="vertical" onFinish={async ({ code }) => {
          const result = await dispatch(verifyMfaThunk({ challengeToken: challenge.challengeToken, code }));
          if (verifyMfaThunk.fulfilled.match(result)) navigate(result.payload.mustChangePassword ? '/profile' : '/dashboard');
        }}>
          <Alert type="info" message="Xác thực hai bước" description="Nhập mã 6 số từ ứng dụng xác thực hoặc mã khôi phục. Phiên có hiệu lực 5 phút." style={{ marginBottom: 16 }} />
          <Form.Item name="code" label="Mã xác thực" rules={[{ required: true }]}>
            <Input autoComplete="one-time-code" maxLength={32} autoFocus />
          </Form.Item>
          <Button aria-label="Xác minh" type="primary" htmlType="submit" loading={loading} block>Xác minh</Button>
          <Button onClick={() => dispatch(logout())} block>Đăng nhập lại</Button>
        </Form>}
        {allowPassword && !challenge && !phoneMode && (
          <Form layout="vertical" onFinish={onFinish}>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
              <Input size="large" placeholder="superadmin@system.vn" />
            </Form.Item>
            <Form.Item name="password" label="Mật khẩu" rules={[{ required: true }]}>
              <Input.Password size="large" placeholder="Password@123" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              Đăng nhập
            </Button>
          </Form>
        )}
        {!challenge && phoneMode && (
          <Form
            layout="vertical"
            initialValues={{ channel: 'SMS' }}
            onFinish={async (values) => {
              setLocalError('');
              dispatch(clearError());
              if (!phoneChallenge) {
                await dispatch(
                  requestPhoneLoginThunk({
                    phone: values.phone,
                    channel: values.channel || 'SMS',
                  })
                );
              } else {
                const result = await dispatch(
                  verifyPhoneLoginThunk({
                    challengeId: phoneChallenge.challengeId,
                    code: values.code,
                  })
                );
                if (verifyPhoneLoginThunk.fulfilled.match(result) && !result.payload.mfaRequired) {
                  navigate(result.payload.mustChangePassword ? '/profile' : '/dashboard');
                }
              }
            }}
          >
            {!phoneChallenge ? (
              <>
                <Form.Item
                  name="phone"
                  label="Số điện thoại"
                  rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
                >
                  <Input size="large" placeholder="0817256858 hoặc +84901234567" />
                </Form.Item>
                <Form.Item
                  name="channel"
                  label="Phương thức nhận mã OTP"
                >
                  <Radio.Group buttonStyle="solid" style={{ width: '100%', display: 'flex' }}>
                    <Radio.Button value="SMS" style={{ flex: 1, textAlign: 'center' }}>
                      Tin nhắn SMS
                    </Radio.Button>
                    <Radio.Button value="ZALO" style={{ flex: 1, textAlign: 'center' }}>
                      Zalo ZNS
                    </Radio.Button>
                  </Radio.Group>
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block size="large">
                  Gửi mã OTP
                </Button>
              </>
            ) : (
              <>
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="Mã OTP đã được gửi"
                  description={`Mã OTP đã được gửi qua ${
                    phoneChallenge?.channel === 'ZALO' ? 'Zalo' : 'tin nhắn SMS'
                  }. Vui lòng kiểm tra để nhận mã xác thực.`}
                />
                <Form.Item
                  name="code"
                  label="Mã xác thực OTP"
                  rules={[{ required: true, message: 'Vui lòng nhập mã OTP 6 số' }]}
                >
                  <Input
                    size="large"
                    maxLength={6}
                    placeholder="Nhập 6 số OTP"
                    autoComplete="one-time-code"
                    autoFocus
                  />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block size="large">
                  Xác minh và Đăng nhập
                </Button>
                <Button
                  type="link"
                  onClick={() => {
                    dispatch(clearPhoneChallenge());
                    setLocalError('');
                  }}
                  block
                  style={{ marginTop: 8 }}
                >
                  Đổi số điện thoại hoặc phương thức
                </Button>
              </>
            )}
          </Form>
        )}

        {!challenge && (
          <Button
            type="link"
            onClick={() => {
              setPhoneMode((value) => !value);
              dispatch(clearPhoneChallenge());
              setLocalError('');
            }}
            block
            style={{ marginTop: 4 }}
          >
            {phoneMode ? '← Quay lại đăng nhập bằng email' : 'Đăng nhập bằng số điện thoại'}
          </Button>
        )}

        <div style={{ display: challenge ? 'none' : undefined }}>
        <Divider plain>Hoặc (tùy chọn)</Divider>

        <div style={{ minHeight: 44, display: 'flex', justifyContent: 'center' }} ref={googleBtnRef} />

        {clientId && !googleReady && !googleRenderError && (
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center' }}>
            Đang tải Google Sign-In…
          </Typography.Text>
        )}

        {!clientId && (
          <Alert
            type="info"
            showIcon
            style={{ marginTop: 8 }}
            message="Google Sign-In chưa cấu hình"
            description="Thêm GOOGLE_CLIENT_ID vào ExpressJS/.env và restart API."
          />
        )}

        {googleRenderError && (
          <Alert type="warning" showIcon style={{ marginTop: 8 }} message={googleRenderError} />
        )}
        </div>
      </Card>
    </div>
);

export default LoginPanel;
