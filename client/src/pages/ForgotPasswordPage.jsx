import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../utils/api';

const inputBase =
  'w-full rounded-md bg-white border border-zinc-300 pl-10 pr-4 py-2.5 text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 hover:border-zinc-400';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentMessage, setSentMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Enter a valid email');
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      setSentMessage(data.message || 'If an account exists for that email, a reset link has been sent.');
    } catch (err) {
      setError(err.message || 'Failed to request a reset');
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a3 3 0 11-6 0 3 3 0 016 0z M5 21v-2a4 4 0 014-4h6a4 4 0 014 4v2 M17 11l2 2 4-4" />
              </svg>
            </div>
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">Account recovery</p>
            <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight">Forgot your password?</h1>
            <p className="mt-2 text-sm text-zinc-500 max-w-sm mx-auto">
              Enter the email you signed up with — we'll send you a link to reset it.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)] p-6 sm:p-8">
            {sentMessage ? (
              <div className="text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-emerald-700" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l4 4L19 6" />
                  </svg>
                </div>
                <p className="mt-4 text-sm text-zinc-800">{sentMessage}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  Check your inbox (and spam folder) — the link expires in 1 hour.
                </p>
                <Link
                  to="/auth"
                  className="mt-5 inline-flex rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 transition"
                >
                  ← Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="fp-email" className="block mb-1.5 text-sm font-medium text-zinc-700">
                    Email
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16v12H4z M4 6l8 7 8-7" />
                      </svg>
                    </span>
                    <input
                      id="fp-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputBase}
                      placeholder="you@example.com"
                    />
                  </div>
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
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>

                <p className="text-center text-sm pt-2 border-t border-zinc-100">
                  Remembered it?{' '}
                  <Link to="/auth" className="text-emerald-700 hover:text-emerald-800 font-medium">
                    Sign in
                  </Link>
                </p>
              </form>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-zinc-500">
            For security, we return the same response whether or not an account exists.
          </p>
        </div>
      </main>
    </div>
  );
};

export default ForgotPasswordPage;
