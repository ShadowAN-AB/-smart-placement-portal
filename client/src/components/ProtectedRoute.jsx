import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, role }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (role && user?.role !== role) {
    if (user?.role === 'admin') {
      return <Navigate to="/dashboard/admin" replace />;
    }

    return <Navigate to={user?.role === 'recruiter' ? '/dashboard/recruiter' : '/dashboard/student'} replace />;
  }

  return children;
};

export default ProtectedRoute;
