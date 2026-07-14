import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../../src/components/ProtectedRoute';
import { AuthProvider } from '../../src/context/AuthContext';

const renderWithRoute = ({ initialPath, protectedRole, user }) => {
  if (user) {
    localStorage.setItem('spp_token', 'tok');
    localStorage.setItem('spp_user', JSON.stringify(user));
  }
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/auth" element={<div>auth-page</div>} />
          <Route path="/dashboard/student" element={<div>student-dash</div>} />
          <Route path="/dashboard/recruiter" element={<div>recruiter-dash</div>} />
          <Route path="/dashboard/admin" element={<div>admin-dash</div>} />
          <Route
            path="/gated"
            element={
              <ProtectedRoute role={protectedRole}>
                <div>gated-content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
};

describe('ProtectedRoute', () => {
  it('redirects to /auth when unauthenticated', () => {
    renderWithRoute({ initialPath: '/gated', protectedRole: 'student', user: null });
    expect(screen.getByText('auth-page')).toBeInTheDocument();
  });

  it('renders content when the role matches', () => {
    renderWithRoute({
      initialPath: '/gated',
      protectedRole: 'student',
      user: { id: 'u1', name: 'A', role: 'student' },
    });
    expect(screen.getByText('gated-content')).toBeInTheDocument();
  });

  it('redirects a recruiter away from a student-only route', () => {
    renderWithRoute({
      initialPath: '/gated',
      protectedRole: 'student',
      user: { id: 'u2', name: 'R', role: 'recruiter' },
    });
    expect(screen.getByText('recruiter-dash')).toBeInTheDocument();
  });

  it('redirects an admin to the admin dash regardless of protectedRole', () => {
    renderWithRoute({
      initialPath: '/gated',
      protectedRole: 'student',
      user: { id: 'u3', name: 'Boss', role: 'admin' },
    });
    expect(screen.getByText('admin-dash')).toBeInTheDocument();
  });

  it('renders content when no role is required and user is authenticated', () => {
    renderWithRoute({
      initialPath: '/gated',
      protectedRole: undefined,
      user: { id: 'u1', name: 'A', role: 'student' },
    });
    expect(screen.getByText('gated-content')).toBeInTheDocument();
  });
});
