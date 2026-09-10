import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { canVisit } from '../../util/permissions';

export const PrivateRoute = () => {
  const { isAuthenticated, appLoading, user } = useSelector((s) => s.auth);
  const location = useLocation();
  if (appLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.mustChangePassword && location.pathname !== '/profile') return <Navigate to="/profile" replace />;
  if (!canVisit(user, location.pathname)) return <Navigate to="/dashboard" replace />;
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
