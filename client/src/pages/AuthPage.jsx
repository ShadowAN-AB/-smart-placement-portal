import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';

const initialForm = {
  name: '',
  email: '',
  password: '',
  role: 'student',
  adminCode: '',
};

const AuthPage = () => {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setSession } = useAuth();
  const navigate = useNavigate();

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
      navigate(data.user.role === 'admin' ? '/dashboard/admin' : data.user.role === 'recruiter' ? '/dashboard/recruiter' : '/dashboard/student', {
        replace: true,
      });
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl rounded-2xl overflow-hidden grid md:grid-cols-2 shadow-panel border border-slate-800/80">
        <section className="relative bg-gradient-to-br from-intel-blue via-intel-blue-dark to-slate-900 p-8 md:p-10 flex flex-col justify-between">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#ffffff,_transparent_55%)]" />
          <div className="relative z-10">
            <p className="text-xs tracking-[0.2em] uppercase text-blue-100">Nexus Intelligence</p>
            <h1 className="text-3xl md:text-4xl font-heading font-extrabold mt-4 leading-tight tracking-tight">
              Build Your Career with Intelligent Placement Matching
            </h1>
            <p className="mt-4 text-blue-100/95">
              Students and recruiters connect through one platform with role-based dashboards.
            </p>
            <p className="mt-2 text-xs text-blue-100/80 uppercase tracking-wide">AES-256 secure session architecture</p>
          </div>
          <div className="relative z-10 mt-8 space-y-2 text-sm text-blue-100/95">
            <p>Phase 1 Focus:</p>
            <p>- Secure login and signup</p>
            <p>- Student and recruiter role split</p>
            <p>- Protected dashboard routing</p>
          </div>
        </section>

        <section className="bg-slate-900 p-8 md:p-10">
          <div className="flex bg-slate-800 rounded-portal p-1 mb-6 border border-slate-700/70">
            <button
              type="button"
              className={`flex-1 py-2 rounded-portal font-semibold transition ${
                mode === 'login' ? 'bg-intel-blue text-white' : 'text-slate-300 hover:text-slate-100'
              }`}
              onClick={() => {
                setMode('login');
                setError('');
              }}
            >
              Login
            </button>
            <button
              type="button"
              className={`flex-1 py-2 rounded-portal font-semibold transition ${
                mode === 'signup' ? 'bg-intel-blue text-white' : 'text-slate-300 hover:text-slate-100'
              }`}
              onClick={() => {
                setMode('signup');
                setError('');
              }}
            >
              Signup
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block mb-1 text-sm text-slate-300">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full rounded-portal bg-slate-800 border border-slate-700 px-4 py-2.5 outline-none focus:ring-2 focus:ring-intel-blue-light focus:border-transparent"
                  placeholder="Abdullah Naseem"
                />
              </div>
            )}

            <div>
              <label className="block mb-1 text-sm text-slate-300">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full rounded-portal bg-slate-800 border border-slate-700 px-4 py-2.5 outline-none focus:ring-2 focus:ring-intel-blue-light focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm text-slate-300">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                className="w-full rounded-portal bg-slate-800 border border-slate-700 px-4 py-2.5 outline-none focus:ring-2 focus:ring-intel-blue-light focus:border-transparent"
                placeholder="Minimum 6 characters"
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block mb-2 text-sm text-slate-300">Choose Role</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => updateField('role', 'student')}
                    className={`rounded-portal border px-3 py-2 text-sm font-medium transition ${
                      form.role === 'student'
                        ? 'bg-intel-blue text-white border-intel-blue'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('role', 'recruiter')}
                    className={`rounded-portal border px-3 py-2 text-sm font-medium transition ${
                      form.role === 'recruiter'
                        ? 'bg-intel-blue text-white border-intel-blue'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    Recruiter
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('role', 'admin')}
                    className={`rounded-portal border px-3 py-2 text-sm font-medium transition ${
                      form.role === 'admin'
                        ? 'bg-intel-blue text-white border-intel-blue'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>
            )}

            {mode === 'signup' && form.role === 'admin' ? (
              <div>
                <label className="block mb-1 text-sm text-slate-300">Admin Signup Code</label>
                <input
                  type="password"
                  value={form.adminCode}
                  onChange={(e) => updateField('adminCode', e.target.value)}
                  className="w-full rounded-portal bg-slate-800 border border-slate-700 px-4 py-2.5 outline-none focus:ring-2 focus:ring-intel-blue-light focus:border-transparent"
                  placeholder="Enter admin code"
                />
              </div>
            ) : null}

            {error && <p className="text-sm text-error">{error}</p>}

            <button
              disabled={loading}
              className="w-full rounded-portal bg-intel-blue text-white py-2.5 font-bold hover:bg-intel-blue-dark transition disabled:opacity-60"
              type="submit"
            >
              {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Login'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
};

export default AuthPage;
