import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, Form, Input, Button, Typography, Alert, Divider } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clearError, loginGoogleThunk, loginThunk } from '../Redux/authSlice';
import { getAuthConfigApi } from '../api';

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
  const { loading, error } = useSelector((s) => s.auth);
  const [localError, setLocalError] = useState('');
  const [googleReady, setGoogleReady] = useState(false);
  const [googleRenderError, setGoogleRenderError] = useState('');
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
      if (loginGoogleThunk.fulfilled.match(result)) {
        navigate('/dashboard');
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
    if (loginThunk.fulfilled.match(result)) {
      navigate('/dashboard');
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

        {allowPassword && (
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
      </Card>
    </div>
  );
};

export default LoginPage;
