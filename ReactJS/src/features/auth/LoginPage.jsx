import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clearError, loginGoogleThunk, loginThunk } from '../../store/auth.slice';
import { getAuthConfigApi } from '../../services/api.service';
import LoginPanel from './LoginPanel';

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

  return <LoginPanel config={config} localError={localError} error={error} challenge={challenge} loading={loading} phoneChallenge={phoneChallenge} phoneMode={phoneMode} setPhoneMode={setPhoneMode} setLocalError={setLocalError} dispatch={dispatch} navigate={navigate} onFinish={onFinish} googleBtnRef={googleBtnRef} clientId={clientId} allowPassword={allowPassword} googleReady={googleReady} googleRenderError={googleRenderError} />;
};

export default LoginPage;
