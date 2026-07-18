import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApplications } from '../hooks/useApplications';
import { useJobs } from '../hooks/useJobs';
import { useProfile } from '../hooks/useProfile';
import { useInterviews } from '../hooks/useInterviews';
import { useNotifications } from '../hooks/useNotifications';
import { apiRequest } from '../utils/api';
import { formatDateShort, formatLPA } from '../utils/formatters';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// -- shared bits ---------------------------------------------------------

const Section = ({ title, subtitle, action, children, className = '' }) => (
  <section className={`rounded-lg border border-zinc-200 bg-white ${className}`}>
    <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 border-b border-zinc-100">
      <div>
        <h2 className="font-heading font-semibold text-zinc-900 text-base">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
      </div>
      {action}
    </div>
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

const Chip = ({ children, tone = 'neutral' }) => {
  const tones = {
    neutral: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    accent: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warn: 'bg-amber-50 text-amber-800 border-amber-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded border ${tones[tone] || tones.neutral}`}>
      {children}
    </span>
  );
};

const APPLICATION_TONES = {
  pending: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  shortlisted: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  interview: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const AppStatus = ({ status }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border capitalize ${
      APPLICATION_TONES[status] || APPLICATION_TONES.pending
    }`}
  >
    {status || 'pending'}
  </span>
);

// -- notification bell (light) ------------------------------------------

const formatWhen = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const NotificationBellLight = () => {
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const clickItem = async (item) => {
    if (!item.read) await markRead(item._id);
    setOpen(false);
    if (item.link) navigate(item.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-semibold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg z-50">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-100">
            <p className="text-sm font-semibold text-zinc-900">Notifications</p>
            {unreadCount > 0 ? (
              <button type="button" onClick={markAllRead} className="text-xs font-medium text-emerald-700 hover:text-emerald-800">
                Mark all read
              </button>
            ) : null}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-zinc-500 text-center">No notifications yet.</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item._id}>
                  <button
                    type="button"
                    onClick={() => clickItem(item)}
                    className={`w-full text-left px-3 py-2.5 border-b border-zinc-100 hover:bg-zinc-50 transition ${
                      item.read ? '' : 'bg-emerald-50/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${item.read ? 'text-zinc-700' : 'text-zinc-900 font-medium'}`}>{item.title}</p>
                        {item.body ? <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{item.body}</p> : null}
                      </div>
                      {!item.read ? <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-600 shrink-0" /> : null}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">{formatWhen(item.createdAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
};

// -- job row (light) ----------------------------------------------------

const matchTone = (score) => {
  if (score >= 75) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (score >= 50) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-zinc-700 bg-zinc-100 border-zinc-200';
};

const JobRow = ({ job, onApply, onView }) => {
  const score = Math.round(job?.match?.score || 0);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-md border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:shadow-sm transition">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-heading font-semibold text-zinc-900 truncate">{job.title}</h3>
          <span className="text-zinc-300">·</span>
          <p className="text-sm text-zinc-600 truncate">{job.company}</p>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">
          {formatLPA(job.minSalary)} – {formatLPA(job.maxSalary)}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(job.requiredSkills || []).slice(0, 6).map((skill) => (
            <Chip key={skill}>{skill}</Chip>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:justify-between sm:gap-2 shrink-0">
        {job.match ? (
          <div className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${matchTone(score)}`}>{score}% match</div>
        ) : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onView?.(job)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 transition"
          >
            View
          </button>
          <button
            type="button"
            onClick={() => onApply?.(job)}
            className="rounded-md bg-zinc-900 text-white px-3 py-1.5 text-xs font-semibold hover:bg-zinc-800 transition"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

// -- upcoming interviews (light) ----------------------------------------

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) : '-';
const formatTime = (d) =>
  d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
const countdown = (d) => {
  if (!d) return '';
  const diff = new Date(d) - new Date();
  if (diff <= 0) return 'Now';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${mins}m`;
  return `in ${mins}m`;
};

const UpcomingInterviewsLight = () => {
  const { interviews, loading, error } = useInterviews({ upcoming: true });
  const openIcs = (id) => {
    const token = localStorage.getItem('spp_token');
    window.open(`${API_BASE_URL}/api/interviews/${id}/calendar?token=${token}`, '_blank');
  };

  return (
    <Section title="Upcoming interviews" subtitle="Scheduled by recruiters">
      {loading ? <Spinner label="Loading interviews…" /> : null}
      {!loading && error ? <p className="text-sm text-red-700">{error}</p> : null}
      {!loading && !error && interviews.length === 0 ? (
        <p className="text-sm text-zinc-500">Nothing on the calendar yet.</p>
      ) : null}
      {!loading && interviews.length > 0 ? (
        <ul className="space-y-3">
          {interviews.slice(0, 3).map((iv) => (
            <li key={iv._id} className="rounded-md border border-zinc-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900 truncate text-sm">{iv.jobId?.title || 'Position'}</p>
                  <p className="text-xs text-zinc-500 truncate">{iv.jobId?.company || 'Company'}</p>
                </div>
                <Chip tone="accent">{countdown(iv.scheduledAt)}</Chip>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-zinc-600">
                <span>{formatDate(iv.scheduledAt)}</span>
                <span className="text-zinc-300">·</span>
                <span>{formatTime(iv.scheduledAt)}</span>
                <span className="text-zinc-300">·</span>
                <span className="capitalize">{iv.meetingType || 'video'}</span>
              </div>
              <div className="mt-2 flex gap-2">
                {iv.meetingType === 'video' && iv.meetingLink ? (
                  <a
                    href={iv.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-zinc-900 text-white px-2.5 py-1 text-xs font-medium hover:bg-zinc-800 transition"
                  >
                    Join
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => openIcs(iv._id)}
                  className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50 transition"
                >
                  Add to calendar
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
};

// -- page ---------------------------------------------------------------

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [actionError, setActionError] = useState('');
  const [applicationPage, setApplicationPage] = useState(1);

  const { profile, loading: profileLoading, saveProfile } = useProfile();
  const { jobs, loading: jobsLoading, error: jobsError, refetchJobs } = useJobs({ page: 1, pageSize: 10 });
  const {
    applications,
    pagination: applicationPagination,
    loading: applicationsLoading,
    error: applicationsError,
    refetchApplications,
  } = useApplications({ page: applicationPage, pageSize: 10 });

  const topRecommendations = useMemo(() => jobs.slice(0, 5), [jobs]);

  const skillInsights = useMemo(() => {
    const demand = new Map();
    (jobs || []).forEach((job) => {
      (job.requiredSkills || []).forEach((skill) => {
        const key = String(skill || '').toLowerCase();
        demand.set(key, (demand.get(key) || 0) + 1);
      });
    });

    const topSkills = [...demand.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([skill]) => skill);

    const studentSkills = new Set((profile?.skills || []).map((item) => String(item).toLowerCase()));
    const missingSkills = topSkills.filter((skill) => !studentSkills.has(skill)).slice(0, 6);

    return { topSkills, missingSkills };
  }, [jobs, profile?.skills]);

  const stats = useMemo(() => {
    const total = applicationPagination?.total || applications.length;
    const shortlisted = applications.filter((a) => a.status === 'shortlisted' || a.status === 'interview').length;
    const avgMatch = applications.length
      ? Math.round(applications.reduce((s, a) => s + (a.matchScore || 0), 0) / applications.length)
      : 0;
    return { total, shortlisted, avgMatch };
  }, [applications, applicationPagination]);

  const applyForJob = async (job) => {
    setActionError('');
    try {
      await apiRequest('/api/applications', {
        method: 'POST',
        body: JSON.stringify({ jobId: job._id }),
      });
      await Promise.all([refetchApplications(), refetchJobs()]);
    } catch (error) {
      setActionError(error.message || 'Failed to apply');
    }
  };

  const seedProfile = async () => {
    setActionError('');
    try {
      await saveProfile({
        skills: ['python', 'javascript', 'react', 'sql'],
        yearsOfExperience: 1,
        expectedSalary: 600000,
        bio: 'Computer science student focused on full-stack product engineering.',
      });
      await refetchJobs();
    } catch (error) {
      setActionError(error.message || 'Failed to update profile');
    }
  };

  const initials = (user?.name || 'S')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-stone-50 text-zinc-900 font-sans">
      {/* Top bar */}
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-white font-heading font-bold text-sm">N</span>
            <div className="hidden sm:block">
              <p className="font-heading font-bold text-sm tracking-tight leading-none">
                Nexus<span className="text-emerald-600">.</span>
              </p>
              <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">Student workspace</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            <button className="px-3 py-1.5 rounded-md text-zinc-900 bg-zinc-100 font-medium">Dashboard</button>
            <button onClick={() => navigate('/interviews')} className="px-3 py-1.5 rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition">
              Interviews
            </button>
            <button onClick={() => navigate('/resume-intelligence')} className="px-3 py-1.5 rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition">
              Resume AI
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <NotificationBellLight />
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-200">
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-sm font-medium text-zinc-900">{user?.name}</span>
                <span className="text-[11px] text-zinc-500 capitalize">{user?.role}</span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-white text-xs font-semibold">
                {initials}
              </div>
              <button
                onClick={logout}
                className="ml-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 transition"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Greeting + KPI strip */}
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">Overview</p>
          <div className="mt-2 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl font-bold tracking-tight">
                Good to see you, {user?.name?.split(' ')[0]}.
              </h1>
              <p className="mt-1 text-sm text-zinc-500">Here's what's happening with your placements today.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={seedProfile}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 transition"
              >
                Auto-fill profile
              </button>
              <button
                onClick={() => navigate('/resume-intelligence')}
                className="rounded-md bg-emerald-600 text-white px-3 py-2 text-sm font-semibold hover:bg-emerald-700 transition"
              >
                Analyse resume
              </button>
            </div>
          </div>

          {actionError ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionError}
            </div>
          ) : null}

          <dl className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Applications', value: stats.total },
              { label: 'Shortlisted / Interview', value: stats.shortlisted },
              { label: 'Avg. match', value: `${stats.avgMatch}%` },
              { label: 'Open roles for you', value: jobs.length },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                <dt className="text-xs uppercase tracking-wider text-zinc-500">{kpi.label}</dt>
                <dd className="mt-1 font-heading text-2xl font-semibold text-zinc-900">{kpi.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            <Section
              title="Recommended roles"
              subtitle="Ranked by Smart Match score"
              action={
                <button
                  onClick={refetchJobs}
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-800 transition"
                >
                  Refresh
                </button>
              }
            >
              {jobsLoading ? <Spinner label="Loading recommendations…" /> : null}
              {!jobsLoading && jobsError ? <p className="text-sm text-red-700">{jobsError}</p> : null}
              {!jobsLoading && !jobsError && topRecommendations.length === 0 ? (
                <p className="text-sm text-zinc-500">No jobs yet — check back after a recruiter posts.</p>
              ) : null}
              {topRecommendations.length > 0 ? (
                <div className="space-y-3">
                  {topRecommendations.map((job) => (
                    <JobRow
                      key={job._id}
                      job={job}
                      onApply={applyForJob}
                      onView={() => navigate(`/jobs/${job._id}`)}
                    />
                  ))}
                </div>
              ) : null}
            </Section>

            <Section title="My applications" subtitle="Live status from recruiters">
              {applicationsLoading ? <Spinner label="Loading applications…" /> : null}
              {!applicationsLoading && applicationsError ? (
                <p className="text-sm text-red-700">{applicationsError}</p>
              ) : null}
              {!applicationsLoading && !applicationsError && applications.length === 0 ? (
                <p className="text-sm text-zinc-500">No applications yet. Apply to a role above to get started.</p>
              ) : null}
              {applications.length > 0 ? (
                <>
                  <div className="overflow-x-auto -mx-5 sm:-mx-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
                          <th className="px-5 sm:px-6 py-2 font-medium">Role</th>
                          <th className="px-3 py-2 font-medium">Company</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium text-right">Match</th>
                          <th className="px-5 sm:px-6 py-2 font-medium text-right">Applied</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {applications.map((application) => (
                          <tr key={application._id} className="hover:bg-zinc-50">
                            <td className="px-5 sm:px-6 py-3 text-zinc-900 font-medium">
                              {application.jobId?.title || '—'}
                            </td>
                            <td className="px-3 py-3 text-zinc-700">{application.jobId?.company || '—'}</td>
                            <td className="px-3 py-3"><AppStatus status={application.status} /></td>
                            <td className="px-3 py-3 text-right text-zinc-800 tabular-nums">
                              {Math.round(application.matchScore || 0)}%
                            </td>
                            <td className="px-5 sm:px-6 py-3 text-right text-zinc-500">
                              {formatDateShort(application.appliedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                    <p>
                      Page {applicationPagination.page} of {applicationPagination.totalPages || 1}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={applicationPagination.page <= 1}
                        onClick={() => setApplicationPage((p) => Math.max(1, p - 1))}
                        className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={applicationPagination.page >= (applicationPagination.totalPages || 1)}
                        onClick={() =>
                          setApplicationPage((p) => Math.min(applicationPagination.totalPages || 1, p + 1))
                        }
                        className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </Section>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <Section title="Career insights" subtitle="What top jobs are asking for">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">In demand</p>
                <div className="flex flex-wrap gap-1.5">
                  {skillInsights.topSkills.length ? (
                    skillInsights.topSkills.map((skill) => <Chip key={skill}>{skill}</Chip>)
                  ) : (
                    <span className="text-xs text-zinc-400">No data yet.</span>
                  )}
                </div>
              </div>
              <div className="mt-5">
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">To add</p>
                <div className="flex flex-wrap gap-1.5">
                  {skillInsights.missingSkills.length ? (
                    skillInsights.missingSkills.map((skill) => (
                      <Chip key={skill} tone="warn">
                        {skill}
                      </Chip>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-400">You're aligned with current jobs.</span>
                  )}
                </div>
              </div>
            </Section>

            <UpcomingInterviewsLight />

            <Section title="Profile snapshot">
              {profileLoading ? (
                <Spinner label="Loading profile…" />
              ) : (
                <ul className="text-sm text-zinc-800 space-y-2">
                  <li className="flex justify-between">
                    <span className="text-zinc-500">Experience</span>
                    <span>{profile?.yearsOfExperience || 0} yrs</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-zinc-500">Expected salary</span>
                    <span>INR {(profile?.expectedSalary || 0).toLocaleString('en-IN')}</span>
                  </li>
                  <li>
                    <span className="text-zinc-500 text-xs uppercase tracking-wider">Bio</span>
                    <p className="mt-1 text-zinc-700 leading-relaxed">
                      {profile?.bio || 'No bio added yet.'}
                    </p>
                  </li>
                </ul>
              )}
            </Section>

            <section className="rounded-lg border border-zinc-900 bg-zinc-900 text-white p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-400">Resume intelligence</p>
              <h3 className="mt-2 font-heading text-lg font-semibold leading-snug">
                Match your resume to every open role in seconds.
              </h3>
              <p className="mt-2 text-sm text-zinc-300">
                Upload once — get skills, projects and per-company fit scores.
              </p>
              <button
                onClick={() => navigate('/resume-intelligence')}
                className="mt-4 inline-flex items-center rounded-md bg-white text-zinc-900 px-3 py-2 text-sm font-semibold hover:bg-zinc-100 transition"
              >
                Open analyser →
              </button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
