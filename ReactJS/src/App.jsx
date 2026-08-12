import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAccountThunk, fetchAppConfigThunk } from './Redux/authSlice';

function App() {
  const dispatch = useDispatch();
  const { appLoading } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchAppConfigThunk());
    dispatch(fetchAccountThunk());
  }, [dispatch]);

  if (appLoading) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return <Outlet />;
}

export default App;
