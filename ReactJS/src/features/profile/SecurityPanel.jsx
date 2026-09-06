import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Form, Input, QRCode, Space, Typography } from 'antd';
import { useDispatch } from 'react-redux';
import { getSecurityApi, securityActionApi } from '../../api';
import { logout } from '../../Redux/authSlice';

function GoogleProof({ clientId, onCredential }) {
  const target = useRef(null);
  const callback = useRef(onCredential);
  callback.current = onCredential;
  useEffect(() => {
    if (!clientId) return undefined;
    const render = () => {
      const google = window.google?.accounts?.id;
      if (!google || !target.current) return false;
      google.initialize({ client_id: clientId, auto_select: false, callback: res => callback.current(res.credential) });
      target.current.innerHTML = '';
      google.renderButton(target.current, { theme: 'outline', size: 'large', text: 'signin_with' });
      return true;
    };
    if (render()) return undefined;
    const interval = setInterval(() => { if (render()) clearInterval(interval); }, 500);
    const timeout = setTimeout(() => clearInterval(interval), 10000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [clientId]);
  return <div ref={target} style={{ marginBottom: 12 }} />;
}

export default function SecurityPanel() {
  const dispatch = useDispatch();
  const [status, setStatus] = useState(null);
  const [setup, setSetup] = useState(null);
  const [done, setDone] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [credential, setCredential] = useState('');
  const [proof] = Form.useForm();
  const [confirmation] = Form.useForm();
  useEffect(() => {
    getSecurityApi().then(res => res?.EC === 0 ? setStatus(res.data) : setError(res?.EM)).catch(() => setError('Không tải được thông tin bảo mật.'));
  }, []);

  async function run(action, values) {
    setBusy(true); setError('');
    try {
      const res = await securityActionApi(action, { ...values, ...(credential ? { credential } : {}) });
      if (res?.EC !== 0) { setError(res?.EM || 'Thao tác thất bại'); return; }
      if (action === 'mfa/setup') setSetup(res.data);
      else { setDone(res.data); setSetup(null); }
      proof.resetFields(); confirmation.resetFields(); setCredential('');
    } catch { setError('Không kết nối được máy chủ API.'); }
    finally { setBusy(false); }
  }

  return <Card title="Bảo mật tài khoản" style={{ marginBottom: 16 }}>
    {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
    {done ? <Space direction="vertical" style={{ width: '100%' }}>
      <Alert type="success" message="Đã cập nhật bảo mật. Các phiên cũ đã được thu hồi." />
      {done.recoveryCodes?.length > 0 && <>
        <Typography.Paragraph>Lưu các mã khôi phục ở nơi riêng tư. Mỗi mã chỉ dùng một lần; danh sách này chỉ hiển thị lần này. Khi đăng nhập ngay sau khi bật 2FA, hãy đợi mã 6 số tiếp theo hoặc dùng mã khôi phục.</Typography.Paragraph>
        <Typography.Paragraph copyable={{ text: done.recoveryCodes.join('\n') }}><pre data-testid="recovery-codes">{done.recoveryCodes.join('\n')}</pre></Typography.Paragraph>
      </>}
      <Button type="primary" onClick={() => dispatch(logout())}>Đã lưu, đăng nhập lại</Button>
    </Space> : status && <>
      <Typography.Paragraph>2FA: {status.mfaEnabled ? `Đã bật — còn ${status.recoveryCodesRemaining} mã khôi phục` : 'Chưa bật'}</Typography.Paragraph>
      {status.mustChangePassword && <Alert type="warning" message="Bạn phải đổi mật khẩu tạm trước khi tiếp tục sử dụng hệ thống." style={{ marginBottom: 16 }} />}
      {!status.mfaAvailable && <Alert type="info" message="Thiết lập ứng dụng xác thực chưa khả dụng. Liên hệ quản trị hệ thống." style={{ marginBottom: 16 }} />}
      <Typography.Paragraph type="secondary">Mật khẩu mới: ít nhất {status.passwordPolicy.minLength} ký tự, tối đa {status.passwordPolicy.maxBytes} byte UTF-8; không dùng lại 5 mật khẩu gần nhất. Có thể dùng cụm từ dài và khoảng trắng.</Typography.Paragraph>
      <Form form={proof} layout="vertical" style={{ maxWidth: 500 }} onFinish={values => run('password', values)}>
        {status.hasPassword && <Form.Item name="currentPassword" label="Mật khẩu hiện tại"><Input.Password autoComplete="current-password" /></Form.Item>}
        {status.googleClientId && <>
          <Typography.Paragraph type="secondary">Hoặc xác minh tài khoản bằng Google:</Typography.Paragraph>
          <GoogleProof clientId={status.googleClientId} onCredential={setCredential} />
          {credential && <Alert type="info" message="Đã nhận xác minh Google, có hiệu lực tối đa 5 phút." />}
        </>}
        {status.mfaEnabled && <Form.Item name="code" label="Mã 2FA hoặc mã khôi phục"><Input autoComplete="one-time-code" maxLength={32} /></Form.Item>}
        <Form.Item name="newPassword" label="Mật khẩu mới"><Input.Password autoComplete="new-password" /></Form.Item>
        <Space wrap>
          <Button type="primary" htmlType="submit" loading={busy}>Đổi mật khẩu</Button>
          {!status.mustChangePassword && (!status.mfaEnabled ?
            <Button disabled={!status.mfaAvailable || busy} onClick={() => run('mfa/setup', proof.getFieldsValue())}>Thiết lập 2FA</Button> : <>
              <Button disabled={busy} onClick={() => run('mfa/recovery', proof.getFieldsValue())}>Tạo lại mã khôi phục</Button>
              <Button danger disabled={busy} onClick={() => run('mfa/disable', proof.getFieldsValue())}>Tắt 2FA</Button>
            </>)}
        </Space>
      </Form>
      {setup && <div style={{ marginTop: 24 }}>
        <Typography.Paragraph>Quét QR bằng ứng dụng xác thực hoặc nhập khóa bên dưới. Thiết lập hết hạn sau 10 phút.</Typography.Paragraph>
        <QRCode value={setup.uri} />
        <Typography.Paragraph copyable={{ text: setup.secret }}>Khóa thiết lập: <code data-testid="totp-secret">{setup.secret}</code></Typography.Paragraph>
        <Form form={confirmation} layout="vertical" style={{ maxWidth: 320 }} onFinish={values => run('mfa/confirm', values)}>
          <Form.Item name="code" label="Mã xác nhận thiết lập" rules={[{ required: true, pattern: /^\d{6}$/ }]}><Input autoComplete="one-time-code" maxLength={6} /></Form.Item>
          <Button type="primary" htmlType="submit" loading={busy}>Bật 2FA</Button>
        </Form>
      </div>}
    </>}
  </Card>;
}
