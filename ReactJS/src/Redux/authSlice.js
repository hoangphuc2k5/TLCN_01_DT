import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getAuthConfigApi, getMeApi, loginApi, loginGoogleApi, requestPhoneLoginApi, verifyPhoneLoginApi, verifyMfaApi } from '../api';
import { applyAppName } from '../util/appBrand';

const initialState = {
  isAuthenticated: false,
  user: null,
  accessToken: localStorage.getItem('access_token') || '',
  loading: false,
  appLoading: true,
  error: '',
  challenge: null,
  phoneChallenge: null,
  appName: localStorage.getItem('app_name') || 'EduMoet',
};

const applyLoginSuccess = (state, action) => {
  state.loading = false;
  state.challenge = action.payload.mfaRequired ? action.payload : null;
  if (state.challenge) {
    state.isAuthenticated = false;
    state.accessToken = '';
    state.user = null;
    state.error = '';
    return;
  }
  state.isAuthenticated = true;
  state.accessToken = action.payload.access_token;
  state.user = action.payload.user;
  state.error = '';
};

export const loginThunk = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await loginApi(email, password);
      if (res && res.EC === 0) {
        if (res.data.access_token) localStorage.setItem('access_token', res.data.access_token);
        else localStorage.removeItem('access_token');
        return res.data;
      }
      return rejectWithValue(res?.EM || 'Đăng nhập thất bại');
    } catch {
      return rejectWithValue(
        'Không kết nối được máy chủ API. Hãy chắc Backend (port 8080) đang chạy.'
      );
    }
  }
);

export const loginGoogleThunk = createAsyncThunk(
  'auth/loginGoogle',
  async (credential, { rejectWithValue }) => {
    try {
      const res = await loginGoogleApi(credential);
      if (res && res.EC === 0) {
        if (res.data.access_token) localStorage.setItem('access_token', res.data.access_token);
        else localStorage.removeItem('access_token');
        return res.data;
      }
      return rejectWithValue(res?.EM || 'Đăng nhập Gmail thất bại');
    } catch {
      return rejectWithValue('Không kết nối được máy chủ API khi đăng nhập Gmail.');
    }
  }
);

export const fetchAppConfigThunk = createAsyncThunk('auth/fetchAppConfig', async () => {
  const res = await getAuthConfigApi();
  if (res?.EC === 0 && res.data?.appName) {
    return applyAppName(res.data.appName);
  }
  return applyAppName(localStorage.getItem('app_name') || 'EduMoet');
});

export const verifyMfaThunk = createAsyncThunk('auth/verifyMfa', async (data, { rejectWithValue }) => {
  try {
    const res = await verifyMfaApi(data);
    if (res?.EC !== 0) return rejectWithValue(res?.EM || 'Xác thực thất bại');
    localStorage.setItem('access_token', res.data.access_token);
    return res.data;
  } catch { return rejectWithValue('Không kết nối được máy chủ API.'); }
});
export const requestPhoneLoginThunk = createAsyncThunk('auth/requestPhoneLogin', async (phone, { rejectWithValue }) => {
  try { const res = await requestPhoneLoginApi(phone); if (res?.EC === 0) return res.data; return rejectWithValue(res?.EM || 'Khong gui duoc OTP'); }
  catch { return rejectWithValue('Khong ket noi duoc may chu API.'); }
});
export const verifyPhoneLoginThunk = createAsyncThunk('auth/verifyPhoneLogin', async (data, { rejectWithValue }) => {
  try { const res = await verifyPhoneLoginApi(data.challengeId, data.code); if (res?.EC !== 0) return rejectWithValue(res?.EM || 'OTP khong hop le'); if (res.data.access_token) localStorage.setItem('access_token', res.data.access_token); return res.data; }
  catch { return rejectWithValue('Khong ket noi duoc may chu API.'); }
});

export const fetchAccountThunk = createAsyncThunk(
  'auth/fetchAccount',
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem('access_token');
    if (!token) return rejectWithValue('NO_TOKEN');
    const res = await getMeApi();
    if (res && res.EC === 0) return res.data;
    return rejectWithValue(res?.EM || 'Không thể lấy thông tin');
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem('access_token');
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = '';
      state.error = '';
      state.challenge = null;
      state.phoneChallenge = null;
      state.appLoading = false;
    },
    clearError: (state) => {
      state.error = '';
    },
    setAppName: (state, action) => {
      state.appName = applyAppName(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAppConfigThunk.fulfilled, (state, action) => {
        state.appName = action.payload;
      })
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(loginThunk.fulfilled, applyLoginSuccess)
      .addCase(verifyMfaThunk.pending, (state) => { state.loading = true; state.error = ''; })
      .addCase(verifyMfaThunk.fulfilled, applyLoginSuccess)
      .addCase(verifyMfaThunk.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Đăng nhập thất bại';
      })
      .addCase(requestPhoneLoginThunk.pending, (state) => { state.loading = true; state.error = ''; })
      .addCase(requestPhoneLoginThunk.fulfilled, (state, action) => { state.loading = false; state.error = ''; state.phoneChallenge = action.payload; })
      .addCase(requestPhoneLoginThunk.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(verifyPhoneLoginThunk.pending, (state) => { state.loading = true; state.error = ''; })
      .addCase(verifyPhoneLoginThunk.fulfilled, applyLoginSuccess)
      .addCase(verifyPhoneLoginThunk.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(loginGoogleThunk.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(loginGoogleThunk.fulfilled, applyLoginSuccess)
      .addCase(loginGoogleThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Đăng nhập Gmail thất bại';
      })
      .addCase(fetchAccountThunk.pending, (state) => {
        state.appLoading = true;
      })
      .addCase(fetchAccountThunk.fulfilled, (state, action) => {
        state.appLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(fetchAccountThunk.rejected, (state) => {
        state.appLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        localStorage.removeItem('access_token');
      });
  },
});

export const { logout, clearError, setAppName } = authSlice.actions;
export default authSlice.reducer;
