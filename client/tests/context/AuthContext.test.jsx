import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';

const Probe = () => {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="auth">{auth.isAuthenticated ? 'yes' : 'no'}</span>
      <span data-testid="name">{auth.user?.name || '-'}</span>
      <button onClick={() => auth.setSession('t1', { id: 'u1', name: 'Alice', role: 'student' })}>login</button>
      <button onClick={auth.logout}>logout</button>
    </div>
  );
};

const wrap = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

describe('AuthContext', () => {
  it('starts unauthenticated when localStorage is empty', () => {
    wrap();
    expect(screen.getByTestId('auth').textContent).toBe('no');
  });

  it('setSession persists token + user to localStorage', () => {
    wrap();
    act(() => screen.getByText('login').click());
    expect(screen.getByTestId('auth').textContent).toBe('yes');
    expect(screen.getByTestId('name').textContent).toBe('Alice');
    expect(localStorage.getItem('spp_token')).toBe('t1');
    const user = JSON.parse(localStorage.getItem('spp_user'));
    expect(user.name).toBe('Alice');
  });

  it('logout clears state and localStorage', () => {
    wrap();
    act(() => screen.getByText('login').click());
    act(() => screen.getByText('logout').click());
    expect(screen.getByTestId('auth').textContent).toBe('no');
    expect(localStorage.getItem('spp_token')).toBeNull();
    expect(localStorage.getItem('spp_user')).toBeNull();
  });

  it('hydrates from localStorage on mount', () => {
    localStorage.setItem('spp_token', 'stored-token');
    localStorage.setItem('spp_user', JSON.stringify({ id: 'u9', name: 'Persisted', role: 'admin' }));
    wrap();
    expect(screen.getByTestId('auth').textContent).toBe('yes');
    expect(screen.getByTestId('name').textContent).toBe('Persisted');
  });
});
