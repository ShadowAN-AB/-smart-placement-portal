import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../utils/api';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!token) {
      setError('Reset link is missing a token. Please request a new one.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: password }),
      });
      setDone(true);
      setTimeout(() => navigate('/auth', { replace: true }), 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-portal shadow-panel p-8">
        <h1 className="text-2xl font-heading font-bold">Set a new password</h1>
        <p className="text-sm text-slate-400 mt-2">
          Choose a password of at least 6 characters.
        </p>

        {done ? (
          <div className="mt-6 p-4 bg-success/10 border border-success/30 rounded-portal">
            <p className="text-sm text-slate-100">Password updated. Redirecting to login…</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="block mb-1 text-sm text-slate-300">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-portal bg-slate-800 border border-slate-700 px-4 py-2.5 outline-none focus:ring-2 focus:ring-intel-blue-light focus:border-transparent"
                placeholder="Minimum 6 characters"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm text-slate-300">Confirm new password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-portal bg-slate-800 border border-slate-700 px-4 py-2.5 outline-none focus:ring-2 focus:ring-intel-blue-light focus:border-transparent"
                placeholder="Re-enter password"
              />
            </div>

            {error ? <p className="text-sm text-error">{error}</p> : null}

            <button
              disabled={loading}
              type="submit"
              className="w-full rounded-portal bg-intel-blue text-white py-2.5 font-bold hover:bg-intel-blue-dark transition disabled:opacity-60"
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>

            <p className="text-center text-sm">
              <Link to="/auth" className="text-slate-400 hover:text-slate-200">
                Back to login
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
};

export default ResetPasswordPage;
