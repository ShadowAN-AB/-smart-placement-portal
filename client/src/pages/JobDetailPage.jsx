import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import { formatLPA } from '../utils/formatters';

// -- primitives ---------------------------------------------------------

const Section = ({ title, subtitle, action, children, className = '' }) => (
  <section className={`rounded-lg border border-zinc-200 bg-white ${className}`}>
    {(title || action) && (
      <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 border-b border-zinc-100">
        <div>
          {title && <h2 className="font-heading font-semibold text-zinc-900 text-base">{title}</h2>}
          {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    <div className="px-5 sm:px-6 py-5">{children}</div>
  </section>
);

const Spinner = ({ label }) => (
  <div className="flex items-center gap-2 text-sm text-zinc-500 py-2">
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
    <span>{label || 'Loading…'}</span>
  </div>
);

const btnAccent =
  'inline-flex items-center gap-1.5 rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition';
const btnGhost =
  'inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 transition';

// -- score helpers ------------------------------------------------------

const scoreTextClass = (v) => {
  if (v >= 80) return 'text-emerald-700';
  if (v >= 55) return 'text-zinc-900';
  if (v >= 35) return 'text-amber-700';
  return 'text-red-700';
};
const scoreStroke = (v) => {
  if (v >= 80) return '#059669';
  if (v >= 55) return '#18181b';
  if (v >= 35) return '#d97706';
  return '#dc2626';
};
const scoreLabel = (v) => {
  if (v >= 80) return 'Excellent match';
  if (v >= 55) return 'Good match';
  if (v >= 35) return 'Fair match';
  return 'Weak match';
};

const MatchGaugeLight = ({ score, subtitle }) => {
  const value = Math.max(0, Math.min(100, Number(score || 0)));
  const circumference = 2 * Math.PI * 44;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#f4f4f5" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="44"
            fill="none"
            stroke={scoreStroke(value)}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-heading text-2xl font-bold tabular-nums ${scoreTextClass(value)}`}>
            {Math.round(value)}%
          </span>
        </div>
      </div>
      <p className={`text-xs mt-2 font-medium ${scoreTextClass(value)}`}>{scoreLabel(value)}</p>
      {subtitle && <p className="text-xs text-zinc-500 mt-0.5 text-center max-w-[180px]">{subtitle}</p>}
    </div>
  );
};

// -- shell --------------------------------------------------------------

const TopBar = ({ user, onDashboard, onSignOut }) => {
  const initials = (user?.name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <header className="border-b border-zinc-200 bg-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-white font-heading font-bold text-sm">N</span>
          <div className="hidden sm:block">
            <p className="font-heading font-bold text-sm tracking-tight leading-none">
              Nexus<span className="text-emerald-600">.</span>
            </p>
            <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">Role detail</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          <button onClick={onDashboard} className="px-3 py-1.5 rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition">
            Dashboard
          </button>
        </nav>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 pl-2 border-l border-zinc-200">
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-sm font-medium text-zinc-900">{user?.name}</span>
              <span className="text-[11px] text-zinc-500 capitalize">{user?.role}</span>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-white text-xs font-semibold">
              {initials}
            </div>
            <button onClick={onSignOut} className={`${btnGhost} ml-1`}>Sign out</button>
          </div>
        </div>
      </div>
    </header>
  );
};

// -- page ---------------------------------------------------------------

const JobDetailPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applyState, setApplyState] = useState({ loading: false, message: '', kind: '' });

  useEffect(() => {
    const loadJob = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiRequest(`/api/jobs/${jobId}`);
        setJob(data.job || null);
      } catch (err) {
        setError(err.message || 'Failed to load job details');
      } finally {
        setLoading(false);
      }
    };
    loadJob();
  }, [jobId]);

  const applyNow = async () => {
    setApplyState({ loading: true, message: '', kind: '' });
    try {
      await apiRequest('/api/applications', {
        method: 'POST',
        body: JSON.stringify({ jobId }),
      });
      setApplyState({ loading: false, message: 'Application submitted — recruiter will get back to you.', kind: 'success' });
    } catch (err) {
      setApplyState({ loading: false, message: err.message || 'Failed to apply', kind: 'error' });
    }
  };

  const dashboardPath = user?.role === 'admin'
    ? '/dashboard/admin'
    : user?.role === 'recruiter'
    ? '/dashboard/recruiter'
    : '/dashboard/student';

  const matchedSet = useMemo(
    () => new Set((job?.match?.matchedSkills || []).map((s) => String(s).toLowerCase())),
    [job]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 text-zinc-900 font-sans">
        <TopBar user={user} onDashboard={() => navigate(dashboardPath)} onSignOut={logout} />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <div className="rounded-lg border border-zinc-200 bg-white px-5 py-6">
            <Spinner label="Loading role…" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-stone-50 text-zinc-900 font-sans">
        <TopBar user={user} onDashboard={() => navigate(dashboardPath)} onSignOut={logout} />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-4">
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error || 'Role not found.'}
          </div>
          <button onClick={() => navigate(-1)} className={btnGhost}>← Back</button>
        </main>
      </div>
    );
  }

  const companyInitial = (job.company || 'C')[0]?.toUpperCase() || 'C';
  const isStudent = user?.role === 'student';

  return (
    <div className="min-h-screen bg-stone-50 text-zinc-900 font-sans">
      <TopBar user={user} onDashboard={() => navigate(dashboardPath)} onSignOut={logout} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Breadcrumb + back */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className={btnGhost}>← Back</button>
          <p className="text-xs text-zinc-500">
            <span onClick={() => navigate(dashboardPath)} className="hover:text-zinc-800 cursor-pointer">Dashboard</span>
            <span className="mx-1.5 text-zinc-300">/</span>
            <span className="text-zinc-700">Role</span>
          </p>
        </div>

        {/* Header card */}
        <section className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
          <div className="px-6 sm:px-8 pt-7 pb-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex gap-4 min-w-0">
                <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-white font-heading text-xl font-bold">
                  {companyInitial}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">Open role</p>
                  <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-zinc-900">{job.title}</h1>
                  <p className="mt-1 text-zinc-600">{job.company}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-700">
                    <span className="inline-flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-zinc-400" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8v8m0-8V6m0 12v2m9-10a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium text-zinc-900">
                        {formatLPA(job.minSalary)} – {formatLPA(job.maxSalary)}
                      </span>
                    </span>
                    <span className="text-zinc-300">·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-zinc-400" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3M12 3a9 9 0 100 18 9 9 0 000-18z" />
                      </svg>
                      {job.minExperience || 0}+ yrs experience
                    </span>
                    {job.status === 'closed' ? (
                      <>
                        <span className="text-zinc-300">·</span>
                        <span className="inline-flex items-center px-2 py-0.5 text-xs rounded border border-zinc-200 bg-zinc-100 text-zinc-700">
                          Closed
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              {isStudent && job.match ? (
                <div className="shrink-0">
                  <MatchGaugeLight score={job.match.score} subtitle={job.match.explanation} />
                </div>
              ) : null}
            </div>

            {isStudent ? (
              <div className="mt-6 pt-6 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  onClick={applyNow}
                  disabled={applyState.loading || job.status === 'closed'}
                  className={btnAccent}
                >
                  {applyState.loading
                    ? 'Applying…'
                    : job.status === 'closed'
                    ? 'Role closed'
                    : 'Apply for this role'}
                </button>
                {applyState.message ? (
                  <p
                    className={`text-sm ${
                      applyState.kind === 'success' ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {applyState.message}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500">
                    You can apply once. Your application shows up in your dashboard immediately.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </section>

        {/* Body: description + skills sidebar */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Section className="lg:col-span-2" title="About this role">
            <div className="prose prose-sm max-w-none text-zinc-800 whitespace-pre-wrap leading-relaxed">
              {job.description || 'No description provided.'}
            </div>
          </Section>

          <div className="space-y-6">
            <Section title="Required skills" subtitle={`${(job.requiredSkills || []).length} listed`}>
              {(job.requiredSkills || []).length === 0 ? (
                <p className="text-sm text-zinc-500">No specific skills listed.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(job.requiredSkills || []).map((skill) => {
                    const matched = matchedSet.has(String(skill).toLowerCase());
                    return (
                      <span
                        key={skill}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border ${
                          matched && isStudent
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                        }`}
                      >
                        {matched && isStudent ? (
                          <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l4 4L19 6" />
                          </svg>
                        ) : null}
                        {skill}
                      </span>
                    );
                  })}
                </div>
              )}
              {isStudent && job.match?.matchedSkills?.length ? (
                <p className="mt-3 text-xs text-zinc-500">
                  <span className="text-emerald-700 font-medium">✓</span> = skill already on your profile.
                </p>
              ) : null}
            </Section>

            {isStudent && job.match?.missingSkills?.length ? (
              <Section title="Skills to add" subtitle="Would lift your match score">
                <div className="flex flex-wrap gap-1.5">
                  {job.match.missingSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center px-2 py-0.5 text-xs rounded border border-amber-200 bg-amber-50 text-amber-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </Section>
            ) : null}

            <Section title="At a glance">
              <dl className="text-sm space-y-2">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Company</dt>
                  <dd className="text-zinc-900 font-medium">{job.company}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Min. experience</dt>
                  <dd className="text-zinc-900">{job.minExperience || 0} yrs</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Salary band</dt>
                  <dd className="text-zinc-900">
                    {formatLPA(job.minSalary)} – {formatLPA(job.maxSalary)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Status</dt>
                  <dd className="capitalize text-zinc-900">{job.status || 'active'}</dd>
                </div>
              </dl>
            </Section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default JobDetailPage;
