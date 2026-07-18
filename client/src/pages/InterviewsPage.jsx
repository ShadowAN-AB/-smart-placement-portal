import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useInterviews } from '../hooks/useInterviews';
import { formatInterviewDate, formatInterviewTime, getCountdown } from '../utils/formatters';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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

const btnPrimary =
  'inline-flex items-center gap-1.5 rounded-md bg-zinc-900 text-white px-3 py-1.5 text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition';
const btnGhost =
  'inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition';
const btnAccent =
  'inline-flex items-center gap-1.5 rounded-md bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition';
const btnDanger =
  'inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-1.5 text-xs font-semibold hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition';

const inputBase =
  'w-full rounded-md bg-white border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 hover:border-zinc-400';

const Chip = ({ children, tone = 'neutral' }) => {
  const tones = {
    neutral: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    accent: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warn: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded border ${tones[tone] || tones.neutral}`}>
      {children}
    </span>
  );
};

const STATUS_STYLE = {
  scheduled: { tone: 'accent', label: 'Scheduled' },
  completed: { tone: 'neutral', label: 'Completed' },
  cancelled: { tone: 'danger', label: 'Cancelled' },
};
const StatusPill = ({ status }) => {
  const s = STATUS_STYLE[status] || STATUS_STYLE.scheduled;
  return <Chip tone={s.tone}>{s.label}</Chip>;
};

const MEETING_LABEL = {
  video: 'Video call',
  phone: 'Phone call',
  'in-person': 'In person',
};

const MeetingIcon = ({ type }) => {
  if (type === 'phone') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.37 1.9.72 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0122 16.92z" />
      </svg>
    );
  }
  if (type === 'in-person') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1118 0z M12 13a3 3 0 100-6 3 3 0 000 6z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M23 7l-7 5 7 5V7z M14 5H3a2 2 0 00-2 2v10a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2z" />
    </svg>
  );
};

// -- feedback modal -----------------------------------------------------

const FeedbackModal = ({ open, onClose, onSubmit, saving }) => {
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState('3');
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-zinc-900/50 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-lg shadow-xl my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between px-6 py-4 border-b border-zinc-100">
          <div>
            <h3 className="font-heading text-lg font-semibold text-zinc-900">Complete interview</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Add feedback and a rating.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Feedback</label>
            <textarea
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Describe the candidate's performance…"
              className={`${inputBase} resize-none`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Rating</label>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = String(n) === rating;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(String(n))}
                    aria-pressed={active}
                    className={`rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                      active
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-zinc-300 text-zinc-700 hover:border-zinc-400'
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {['—', 'Poor', 'Below average', 'Average', 'Good', 'Excellent'][Number(rating)]}
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <button onClick={onClose} className={btnGhost}>Cancel</button>
            <button
              onClick={() => onSubmit({ feedback, rating: Number(rating) })}
              disabled={saving}
              className={btnAccent}
            >
              {saving ? 'Saving…' : 'Mark complete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// -- page ---------------------------------------------------------------

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const InterviewsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('');
  const { interviews, loading, error, cancelInterview, completeInterview } = useInterviews(
    filter ? { status: filter } : {}
  );
  const [actionLoading, setActionLoading] = useState('');
  const [actionError, setActionError] = useState('');
  const [feedbackModal, setFeedbackModal] = useState({ open: false, interviewId: '' });

  const isRecruiter = user?.role === 'recruiter';
  const dashboardPath = isRecruiter ? '/dashboard/recruiter' : '/dashboard/student';

  const counts = useMemo(() => {
    const c = { total: interviews.length, scheduled: 0, completed: 0, cancelled: 0 };
    interviews.forEach((iv) => {
      if (iv.status === 'scheduled') c.scheduled += 1;
      if (iv.status === 'completed') c.completed += 1;
      if (iv.status === 'cancelled') c.cancelled += 1;
    });
    return c;
  }, [interviews]);

  const downloadCalendar = (interviewId) => {
    const token = localStorage.getItem('spp_token');
    window.open(`${API_BASE_URL}/api/interviews/${interviewId}/calendar?token=${token}`, '_blank');
  };

  const handleCancel = async (interviewId) => {
    const reason = window.prompt('Reason for cancellation (optional):');
    if (reason === null) return;
    setActionLoading(interviewId);
    setActionError('');
    try {
      await cancelInterview(interviewId, reason);
    } catch (err) {
      setActionError(err.message || 'Failed to cancel');
    } finally {
      setActionLoading('');
    }
  };

  const openFeedbackModal = (interviewId) =>
    setFeedbackModal({ open: true, interviewId });
  const closeFeedbackModal = () =>
    setFeedbackModal({ open: false, interviewId: '' });

  const submitFeedback = async ({ feedback, rating }) => {
    setActionLoading(feedbackModal.interviewId);
    setActionError('');
    try {
      await completeInterview(feedbackModal.interviewId, { feedback, rating });
      closeFeedbackModal();
    } catch (err) {
      setActionError(err.message || 'Failed to complete');
    } finally {
      setActionLoading('');
    }
  };

  const initials = (user?.name || '?')
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
              <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">Interview centre</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            <button onClick={() => navigate(dashboardPath)} className="px-3 py-1.5 rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition">
              Dashboard
            </button>
            <button className="px-3 py-1.5 rounded-md text-zinc-900 bg-zinc-100 font-medium">Interviews</button>
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
              <button onClick={logout} className={`${btnGhost} ml-1`}>Sign out</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">Interview centre</p>
          <div className="mt-2 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl font-bold tracking-tight">All interviews</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Track upcoming interviews, complete past ones and manage cancellations in one place.
              </p>
            </div>
            <button onClick={() => navigate(dashboardPath)} className={btnGhost}>
              ← Back to dashboard
            </button>
          </div>

          {/* KPI strip */}
          <dl className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
              <dt className="text-xs uppercase tracking-wider text-zinc-500">Total</dt>
              <dd className="mt-1 font-heading text-2xl font-semibold text-zinc-900 tabular-nums">{counts.total}</dd>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
              <dt className="text-xs uppercase tracking-wider text-zinc-500">Scheduled</dt>
              <dd className="mt-1 font-heading text-2xl font-semibold text-emerald-700 tabular-nums">{counts.scheduled}</dd>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
              <dt className="text-xs uppercase tracking-wider text-zinc-500">Completed</dt>
              <dd className="mt-1 font-heading text-2xl font-semibold text-zinc-900 tabular-nums">{counts.completed}</dd>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
              <dt className="text-xs uppercase tracking-wider text-zinc-500">Cancelled</dt>
              <dd className="mt-1 font-heading text-2xl font-semibold text-zinc-500 tabular-nums">{counts.cancelled}</dd>
            </div>
          </dl>
        </div>

        {/* Filters */}
        <div
          role="tablist"
          aria-label="Filter interviews"
          className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5 text-sm"
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key || 'all'}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-[5px] font-medium transition ${
                  active
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {actionError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</div>
        ) : null}

        {/* List */}
        {loading ? (
          <div className="rounded-lg border border-zinc-200 bg-white px-5 py-6">
            <Spinner label="Loading interviews…" />
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        {!loading && !error && interviews.length === 0 ? (
          <Section title="No interviews">
            <div className="text-center py-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v4m8-4v4M3 10h18M5 6h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                </svg>
              </div>
              <p className="mt-3 text-sm text-zinc-500">
                Nothing to show for this filter yet.
              </p>
            </div>
          </Section>
        ) : null}

        {!loading && interviews.length > 0 ? (
          <div className="space-y-3">
            {interviews.map((iv) => (
              <article
                key={iv._id}
                className={`rounded-lg border border-zinc-200 bg-white p-5 hover:border-zinc-300 transition ${
                  iv.status === 'cancelled' ? 'opacity-70' : ''
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  {/* Details */}
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading font-semibold text-zinc-900 text-lg">
                        {iv.jobId?.title || 'Position'}
                      </h3>
                      <StatusPill status={iv.status} />
                      {iv.status === 'scheduled' ? (
                        <Chip tone="accent">{getCountdown(iv.scheduledAt)}</Chip>
                      ) : null}
                    </div>
                    <p className="text-sm text-zinc-600">{iv.jobId?.company || 'Company'}</p>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-zinc-700">
                      <span className="inline-flex items-center gap-1.5">
                        <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-zinc-400" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v4m8-4v4M3 10h18M5 6h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                        </svg>
                        {formatInterviewDate(iv.scheduledAt)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-zinc-400" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                        </svg>
                        {formatInterviewTime(iv.scheduledAt)}
                      </span>
                      <span className="text-zinc-500">·</span>
                      <span>{iv.duration || 30} min</span>
                      <span className="text-zinc-500">·</span>
                      <span className="inline-flex items-center gap-1.5 text-zinc-700">
                        <span className="text-zinc-400"><MeetingIcon type={iv.meetingType} /></span>
                        {MEETING_LABEL[iv.meetingType] || 'Video call'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-100 text-sm">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-zinc-500">Candidate</p>
                        <p className="text-zinc-900 mt-0.5">{iv.studentId?.name || '—'}</p>
                        <p className="text-xs text-zinc-500">{iv.studentId?.email || ''}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-zinc-500">Recruiter</p>
                        <p className="text-zinc-900 mt-0.5">{iv.recruiterId?.name || '—'}</p>
                        <p className="text-xs text-zinc-500">{iv.recruiterId?.email || ''}</p>
                      </div>
                    </div>

                    {iv.notes ? (
                      <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                        <span className="font-medium text-zinc-800">Notes: </span>
                        {iv.notes}
                      </div>
                    ) : null}

                    {iv.status === 'completed' && iv.feedback ? (
                      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                        <span className="font-semibold">Feedback: </span>
                        {iv.feedback}
                        {iv.rating ? (
                          <span className="ml-2 text-emerald-700">· {iv.rating}/5</span>
                        ) : null}
                      </div>
                    ) : null}

                    {iv.status === 'cancelled' && iv.cancelReason ? (
                      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        <span className="font-semibold">Cancelled: </span>
                        {iv.cancelReason}
                      </div>
                    ) : null}
                  </div>

                  {/* Actions */}
                  <div className="flex md:flex-col gap-2 md:items-end shrink-0 flex-wrap">
                    {iv.meetingType === 'video' && iv.meetingLink && iv.status === 'scheduled' ? (
                      <a
                        href={iv.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={btnAccent}
                      >
                        Join call
                      </a>
                    ) : null}

                    <button onClick={() => downloadCalendar(iv._id)} className={btnGhost}>
                      Add to calendar
                    </button>

                    {isRecruiter && iv.status === 'scheduled' ? (
                      <>
                        <button
                          onClick={() => openFeedbackModal(iv._id)}
                          disabled={actionLoading === iv._id}
                          className={btnPrimary}
                        >
                          Mark complete
                        </button>
                        <button
                          onClick={() => handleCancel(iv._id)}
                          disabled={actionLoading === iv._id}
                          className={btnDanger}
                        >
                          Cancel
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </main>

      <FeedbackModal
        open={feedbackModal.open}
        onClose={closeFeedbackModal}
        onSubmit={submitFeedback}
        saving={!!actionLoading}
      />
    </div>
  );
};

export default InterviewsPage;
