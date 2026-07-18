import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../utils/api';

const inputBase =
  'w-full rounded-md bg-white border border-zinc-300 pl-10 pr-14 py-2.5 text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 hover:border-zinc-400';

// Simple strength heuristic
const gradePassword = (pwd) => {
  if (!pwd) return { score: 0, label: '—', tone: 'text-zinc-400', bar: 'bg-zinc-200', width: '0%' };
  let score = 0;
  if (pwd.length >= 6) score += 1;
  if (pwd.length >= 10) score += 1;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
  const buckets = [
    { label: 'Too short',  tone: 'text-red-700',     bar: 'bg-red-500',     width: '20%' },
    { label: 'Weak',       tone: 'text-red-700',     bar: 'bg-red-500',     width: '35%' },
    { label: 'Fair',       tone: 'text-amber-700',   bar: 'bg-amber-500',   width: '55%' },
    { label: 'Good',       tone: 'text-zinc-900',    bar: 'bg-zinc-900',    width: '75%' },
    { label: 'Strong',     tone: 'text-emerald-700', bar: 'bg-emerald-600', width: '90%' },
    { label: 'Very strong',tone: 'text-emerald-700', bar: 'bg-emerald-600', width: '100%' },
  ];
  return buckets[score];
};

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const strength = useMemo(() => gradePassword(password), [password]);
  const mismatch = confirm.length > 0 && confirm !== password;

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
    <div className="min-h-screen bg-stone-50 text-zinc-900 flex flex-col font-sans">
      <header className="border-b border-zinc-200 bg-white/70 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3.5">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-white font-heading font-bold text-sm">N</span>
            <span className="font-heading font-bold tracking-tight text-zinc-900">
              Nexus<span className="text-emerald-600">.</span>
            </span>
          </Link>
          <Link to="/auth" className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:border-zinc-400 hover:bg-zinc-50 transition">
            Back to sign in
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-white">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-zinc-500" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v4" />
              </svg>
            </div>
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">Account recovery</p>
            <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight">Set a new password</h1>
            <p className="mt-2 text-sm text-zinc-500 max-w-sm mx-auto">
              Choose a password of at least 6 characters. Use a mix of letters, numbers and symbols for a stronger one.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)] p-6 sm:p-8">
            {done ? (
              <div className="text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-emerald-700" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l4 4L19 6" />
                  </svg>
                </div>
                <p className="mt-4 text-sm font-medium text-zinc-900">Password updated.</p>
                <p className="mt-1 text-xs text-zinc-500">Redirecting to sign in…</p>
              </div>
            ) : !token ? (
              <div className="text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-50 border border-red-200">
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-red-700" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <p className="mt-4 text-sm font-medium text-zinc-900">This reset link is invalid.</p>
                <p className="mt-1 text-xs text-zinc-500">Request a new link and try again.</p>
                <Link
                  to="/forgot-password"
                  className="mt-5 inline-flex rounded-md bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-800 transition"
                >
                  Request new link
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="rp-password" className="block mb-1.5 text-sm font-medium text-zinc-700">
                    New password
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v4" />
                      </svg>
                    </span>
                    <input
                      id="rp-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputBase}
                      placeholder="At least 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-500 hover:text-zinc-800 px-2 py-1 rounded"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {password ? (
                    <div className="mt-2">
                      <div className="h-1 rounded-full bg-zinc-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${strength.bar}`}
                          style={{ width: strength.width }}
                        />
                      </div>
                      <p className={`mt-1 text-[11px] font-medium ${strength.tone}`}>
                        Strength · {strength.label}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="rp-confirm" className="block mb-1.5 text-sm font-medium text-zinc-700">
                    Confirm new password
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </span>
                    <input
                      id="rp-confirm"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className={`${inputBase} ${mismatch ? 'border-red-300 focus:border-red-500 focus:ring-red-500/30' : ''}`}
                      placeholder="Re-enter password"
                    />
                  </div>
                  {mismatch ? (
                    <p className="mt-1 text-[11px] font-medium text-red-700">Passwords don't match.</p>
                  ) : null}
                </div>

                {error ? (
                  <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <button
                  disabled={loading}
                  type="submit"
                  className="w-full rounded-md bg-zinc-900 text-white py-2.5 font-medium hover:bg-zinc-800 active:translate-y-px transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && (
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 animate-spin">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  )}
                  {loading ? 'Updating…' : 'Update password'}
                </button>

                <p className="text-center text-sm pt-2 border-t border-zinc-100">
                  <Link to="/auth" className="text-zinc-500 hover:text-zinc-800">
                    Back to sign in
                  </Link>
                </p>
              </form>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-zinc-500">
            Reset links expire after 1 hour and can only be used once.
          </p>
        </div>
      </main>
    </div>
  );
};

export default ResetPasswordPage;
