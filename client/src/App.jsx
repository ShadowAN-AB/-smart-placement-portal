import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import StudentDashboard from './pages/StudentDashboard';
import RecruiterDashboard from './pages/RecruiterDashboard';
import JobDetailPage from './pages/JobDetailPage';
import AdminDashboard from './pages/AdminDashboard';
import ResumeIntelligence from './pages/ResumeIntelligence';
import InterviewsPage from './pages/InterviewsPage';

function App() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate
              to={
                user?.role === 'admin'
                  ? '/dashboard/admin'
                  : user?.role === 'recruiter'
                    ? '/dashboard/recruiter'
                    : '/dashboard/student'
              }
              replace
            />
          ) : (
            <Navigate to="/auth" replace />
          )
        }
      />
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/dashboard/student"
        element={
          <ProtectedRoute role="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/recruiter"
        element={
          <ProtectedRoute role="recruiter">
            <RecruiterDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs/:jobId"
        element={
          <ProtectedRoute>
            <JobDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/resume-intelligence"
        element={
          <ProtectedRoute role="student">
            <ResumeIntelligence />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interviews"
        element={
          <ProtectedRoute>
            <InterviewsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
