import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../utils/api';

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
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-portal shadow-panel p-8">
        <h1 className="text-2xl font-heading font-bold">Forgot your password?</h1>
        <p className="text-sm text-slate-400 mt-2">
          Enter the email you signed up with. We'll send you a link to reset it.
        </p>

        {sentMessage ? (
          <div className="mt-6 p-4 bg-success/10 border border-success/30 rounded-portal">
            <p className="text-sm text-slate-100">{sentMessage}</p>
            <Link to="/auth" className="mt-3 inline-block text-sm text-intel-blue-light hover:text-intel-blue">
              ← Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="block mb-1 text-sm text-slate-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-portal bg-slate-800 border border-slate-700 px-4 py-2.5 outline-none focus:ring-2 focus:ring-intel-blue-light focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            {error ? <p className="text-sm text-error">{error}</p> : null}

            <button
              disabled={loading}
              type="submit"
              className="w-full rounded-portal bg-intel-blue text-white py-2.5 font-bold hover:bg-intel-blue-dark transition disabled:opacity-60"
            >
              {loading ? 'Sending...' : 'Send reset link'}
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

export default ForgotPasswordPage;
