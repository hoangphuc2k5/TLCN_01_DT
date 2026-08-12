import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

export const PrivateRoute = () => {
  const { isAuthenticated, appLoading } = useSelector((s) => s.auth);
  if (appLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
};

export const RoleRoute = ({ roles = [] }) => {
  const { user } = useSelector((s) => s.auth);
  if (!user) return <Navigate to="/login" replace />;
  if (roles.length && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
};
