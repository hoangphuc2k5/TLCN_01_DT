import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, Form, Input, Button, Typography, Alert, Divider, Radio } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clearError, clearPhoneChallenge, loginGoogleThunk, loginThunk, requestPhoneLoginThunk, verifyPhoneLoginThunk, verifyMfaThunk, logout } from '../../store/auth.slice';
import { getAuthConfigApi } from '../../services/api.service';

const waitForGoogle = (timeoutMs = 10000) =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google.accounts.id);
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(timer);
        resolve(window.google.accounts.id);
      } else if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        reject(new Error('Google Sign-In script timeout'));
      }
    }, 100);
  });

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, challenge } = useSelector((s) => s.auth);
  const phoneChallenge = useSelector((s) => s.auth.phoneChallenge);
  const [localError, setLocalError] = useState('');
  const [googleReady, setGoogleReady] = useState(false);
  const [googleRenderError, setGoogleRenderError] = useState('');
  const [phoneMode, setPhoneMode] = useState(false);
  const [config, setConfig] = useState({
    googleClientId: '',
    allowPasswordLogin: true,
    gmailOnly: true,
  });
  const googleBtnRef = useRef(null);

  const onGoogleCredential = useCallback(
    async (response) => {
      setLocalError('');
      dispatch(clearError());
      if (!response?.credential) {
        setLocalError('Không nhận được credential từ Google');
        return;
      }
      const result = await dispatch(loginGoogleThunk(response.credential));
      if (loginGoogleThunk.fulfilled.match(result) && !result.payload.mfaRequired) {
        navigate(result.payload.mustChangePassword ? '/profile' : '/dashboard');
      }
    },
    [dispatch, navigate]
  );

  useEffect(() => {
    (async () => {
      const res = await getAuthConfigApi();
      if (res?.EC === 0) {
        setConfig(res.data);
        if (res.data?.appName) {
          document.title = `${res.data.appName} — Quản lý trường học đa trường`;
        }
      }
    })();
  }, []);

  useEffect(() => {
    const clientId = config.googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setGoogleReady(false);
      return undefined;
    }

    let cancelled = false;
    setGoogleRenderError('');

    (async () => {
      try {
        await waitForGoogle();
        if (cancelled || !googleBtnRef.current) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: onGoogleCredential,
          auto_select: false,
          ux_mode: 'popup',
        });
        googleBtnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 360,
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        });
        if (!cancelled) setGoogleReady(true);
      } catch (err) {
        if (!cancelled) {
          setGoogleReady(false);
          setGoogleRenderError(err.message || 'Không tải được Google Sign-In');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [config.googleClientId, onGoogleCredential]);

  const onFinish = async (values) => {
    setLocalError('');
    dispatch(clearError());
    const result = await dispatch(loginThunk(values));
    if (loginThunk.fulfilled.match(result) && !result.payload.mfaRequired) {
      navigate(result.payload.mustChangePassword ? '/profile' : '/dashboard');
    }
  };

  const clientId = config.googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const allowPassword = config.allowPasswordLogin !== false;

  return (
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
      <Card style={{ width: 420, borderRadius: 16 }} bordered={false}>
        <Typography.Title level={3} style={{ marginBottom: 4, color: '#0f4c5c' }}>
          {config.appName || 'EduMoet'}
        </Typography.Title>
        <Typography.Paragraph type="secondary">
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
};

export default LoginPage;
