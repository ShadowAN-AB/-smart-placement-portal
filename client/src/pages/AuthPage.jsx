import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';

const initialForm = {
  name: '',
  email: '',
  password: '',
  role: 'student',
  adminCode: '',
};

const ROLES = [
  { key: 'student', label: 'Student', hint: 'Find and apply to matched roles.' },
  { key: 'recruiter', label: 'Recruiter', hint: 'Post jobs and shortlist talent.' },
  { key: 'admin', label: 'Admin', hint: 'Approve jobs and manage users.' },
];

const InputIcon = ({ children }) => (
  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
    {children}
  </span>
);

const iconStroke = 'w-4 h-4 stroke-current';

const AuthPage = () => {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const formId = useId();

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const switchMode = (next) => {
    setMode(next);
    setError('');
  };

  const validate = () => {
    if (mode === 'signup' && !form.name.trim()) return 'Name is required';
    if (!form.email.trim()) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Enter a valid email';
    if (!form.password.trim()) return 'Password is required';
    if (form.password.length < 6) return 'Password must be at least 6 characters';
    if (mode === 'signup' && !['student', 'recruiter', 'admin'].includes(form.role)) return 'Choose a role';
    if (mode === 'signup' && form.role === 'admin' && !form.adminCode.trim()) return 'Admin code is required';
    return '';
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const payload =
        mode === 'signup'
          ? {
              name: form.name.trim(),
              email: form.email.trim(),
              password: form.password,
              role: form.role,
              adminCode: form.role === 'admin' ? form.adminCode.trim() : undefined,
            }
          : { email: form.email.trim(), password: form.password };

      const data = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSession(data.token, data.user);
      const roleRoute =
        data.user.role === 'admin'
          ? '/dashboard/admin'
          : data.user.role === 'recruiter'
          ? '/dashboard/recruiter'
          : '/dashboard/student';
      navigate(roleRoute, { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    'w-full rounded-md bg-white border border-zinc-300 pl-10 pr-4 py-2.5 text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 hover:border-zinc-400';

  return (
    <div className="min-h-screen bg-stone-50 text-zinc-900 flex flex-col font-sans">
      {/* Top bar */}
      <header className="border-b border-zinc-200 bg-white/70 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3.5">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-white font-heading font-bold text-sm">
              N
            </span>
            <span className="font-heading font-bold tracking-tight text-zinc-900">
              Nexus<span className="text-emerald-600">.</span>
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-zinc-500">
            <span className="hidden sm:inline">
              {mode === 'login' ? 'New to Nexus?' : 'Already have an account?'}
            </span>
            <button
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:border-zinc-400 hover:bg-zinc-50 transition"
            >
              {mode === 'login' ? 'Create account' : 'Sign in'}
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-16 grid md:grid-cols-[1.05fr_1fr] gap-10 md:gap-16 items-start">
          {/* Left: editorial column */}
          <section className="pt-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">
              Placement Intelligence
            </p>
            <h1 className="mt-4 font-heading font-bold tracking-tight text-4xl md:text-5xl leading-[1.05] text-zinc-900">
              A calmer way to run <span className="italic font-medium text-zinc-700">campus placements.</span>
            </h1>
            <p className="mt-5 text-zinc-600 max-w-lg leading-relaxed">
              One workspace for students, recruiters and administrators. Resume analysis, role matching
              and interview coordination — kept out of your inbox.
            </p>

            <figure className="mt-10 border-l-2 border-emerald-600 pl-5 max-w-lg">
              <blockquote className="text-zinc-800 leading-relaxed">
                “Cut our interview coordination time in half. The AI matching removed the guesswork our
                team was spending hours on every week.”
              </blockquote>
              <figcaption className="mt-3 text-sm text-zinc-500">
                <span className="font-medium text-zinc-800">Priya Menon</span> · Head of Talent, Northwind
              </figcaption>
            </figure>

            <dl className="mt-12 grid grid-cols-3 gap-6 max-w-md border-t border-zinc-200 pt-6">
              <div>
                <dt className="text-xs uppercase tracking-wider text-zinc-500">Matched</dt>
                <dd className="mt-1 font-heading text-2xl font-semibold text-zinc-900">1,200+</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-zinc-500">Open roles</dt>
                <dd className="mt-1 font-heading text-2xl font-semibold text-zinc-900">300+</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-zinc-500">Placement</dt>
                <dd className="mt-1 font-heading text-2xl font-semibold text-zinc-900">92%</dd>
              </div>
            </dl>
          </section>

          {/* Right: form column */}
          <section className="w-full">
            <div className="rounded-lg border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]">
              <div className="px-6 sm:px-8 pt-7 pb-4 border-b border-zinc-100">
                <h2 className="text-xl font-heading font-semibold text-zinc-900">
                  {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {mode === 'login'
                    ? 'Enter your credentials to continue.'
                    : 'It takes less than a minute.'}
                </p>
              </div>

              <div className="px-6 sm:px-8 pt-5">
                <div
                  role="tablist"
                  aria-label="Authentication mode"
                  className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5 text-sm"
                >
                  {[
                    { key: 'login', label: 'Sign in' },
                    { key: 'signup', label: 'Sign up' },
                  ].map((tab) => {
                    const active = mode === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        className={`px-4 py-1.5 rounded-[5px] font-medium transition ${
                          active
                            ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                            : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                        onClick={() => switchMode(tab.key)}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={submit} className="px-6 sm:px-8 py-6 space-y-4" noValidate>
                {mode === 'signup' && (
                  <div>
                    <label htmlFor={`${formId}-name`} className="block mb-1.5 text-sm font-medium text-zinc-700">
                      Full name
                    </label>
                    <div className="relative">
                      <InputIcon>
                        <svg viewBox="0 0 24 24" fill="none" className={iconStroke} strokeWidth="2">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16 14a4 4 0 10-8 0m12 6a8 8 0 10-16 0"
                          />
                        </svg>
                      </InputIcon>
                      <input
                        id={`${formId}-name`}
                        type="text"
                        autoComplete="name"
                        value={form.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        className={inputBase}
                        placeholder="e.g. Priya Sharma"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor={`${formId}-email`} className="block mb-1.5 text-sm font-medium text-zinc-700">
                    Email
                  </label>
                  <div className="relative">
                    <InputIcon>
                      <svg viewBox="0 0 24 24" fill="none" className={iconStroke} strokeWidth="2">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 6h16v12H4z M4 6l8 7 8-7"
                        />
                      </svg>
                    </InputIcon>
                    <input
                      id={`${formId}-email`}
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      className={inputBase}
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <label htmlFor={`${formId}-password`} className="text-sm font-medium text-zinc-700">
                      Password
                    </label>
                    {mode === 'login' && (
                      <Link
                        to="/forgot-password"
                        className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                      >
                        Forgot?
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <InputIcon>
                      <svg viewBox="0 0 24 24" fill="none" className={iconStroke} strokeWidth="2">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v4"
                        />
                      </svg>
                    </InputIcon>
                    <input
                      id={`${formId}-password`}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      value={form.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      className={`${inputBase} pr-14`}
                      placeholder={mode === 'login' ? 'Your password' : 'At least 6 characters'}
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
                </div>

                {mode === 'signup' && (
                  <fieldset>
                    <legend className="block mb-1.5 text-sm font-medium text-zinc-700">I am a</legend>
                    <div className="grid grid-cols-3 rounded-md border border-zinc-300 overflow-hidden divide-x divide-zinc-300">
                      {ROLES.map((r) => {
                        const active = form.role === r.key;
                        return (
                          <button
                            key={r.key}
                            type="button"
                            onClick={() => updateField('role', r.key)}
                            aria-pressed={active}
                            className={`px-3 py-2.5 text-sm font-medium transition ${
                              active
                                ? 'bg-zinc-900 text-white'
                                : 'bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                            }`}
                          >
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-1.5 text-xs text-zinc-500">
                      {ROLES.find((r) => r.key === form.role)?.hint}
                    </p>
                  </fieldset>
                )}

                {mode === 'signup' && form.role === 'admin' ? (
                  <div>
                    <label htmlFor={`${formId}-admin`} className="block mb-1.5 text-sm font-medium text-zinc-700">
                      Admin signup code
                    </label>
                    <div className="relative">
                      <InputIcon>
                        <svg viewBox="0 0 24 24" fill="none" className={iconStroke} strokeWidth="2">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4z"
                          />
                        </svg>
                      </InputIcon>
                      <input
                        id={`${formId}-admin`}
                        type="password"
                        autoComplete="off"
                        value={form.adminCode}
                        onChange={(e) => updateField('adminCode', e.target.value)}
                        className={inputBase}
                        placeholder="Enter admin code"
                      />
                    </div>
                  </div>
                ) : null}

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 mt-0.5 shrink-0" strokeWidth="2">
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                      />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  disabled={loading}
                  className="w-full rounded-md bg-zinc-900 text-white py-2.5 font-medium hover:bg-zinc-800 active:translate-y-px transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  type="submit"
                >
                  {loading && (
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 animate-spin">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                      <path
                        d="M22 12a10 10 0 00-10-10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
                </button>

                {mode === 'signup' && (
                  <p className="text-center text-xs text-zinc-500">
                    By creating an account you agree to our terms and privacy policy.
                  </p>
                )}
              </form>
            </div>

            <p className="mt-4 text-center text-xs text-zinc-500">
              Protected by industry-standard encryption. Sessions expire after 7 days.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} Nexus Placement Intelligence</p>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-zinc-800">Privacy</a>
            <a href="#" className="hover:text-zinc-800">Terms</a>
            <a href="#" className="hover:text-zinc-800">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AuthPage;
