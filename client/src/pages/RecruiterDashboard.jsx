import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InterviewScheduleModal from '../components/InterviewScheduleModal';
import { useAuth } from '../context/AuthContext';
import { useInterviews } from '../hooks/useInterviews';
import { useJobs } from '../hooks/useJobs';
import { useNotifications } from '../hooks/useNotifications';
import { apiRequest } from '../utils/api';
import { formatDateShort, formatLPA } from '../utils/formatters';

// -- shared bits (light) ------------------------------------------------

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
    danger: 'bg-red-50 text-red-700 border-red-200',
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

const btnPrimary =
  'rounded-md bg-zinc-900 text-white px-3 py-1.5 text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition';
const btnGhost =
  'rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition';
const btnDanger =
  'rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-1.5 text-xs font-semibold hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition';
const btnAccent =
  'rounded-md bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition';

const inputBase =
  'w-full rounded-md bg-white border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 hover:border-zinc-400';

// -- notification bell (light) -----------------------------------------

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
        <svg className="w-5 h-5 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
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

// -- light modal --------------------------------------------------------

const LightModal = ({ open, title, subtitle, onClose, children, widthClass = 'max-w-4xl' }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-900/50 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`w-full ${widthClass} bg-white border border-zinc-200 rounded-lg shadow-xl my-8`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-zinc-100">
          <div>
            <h3 className="font-heading text-lg font-semibold text-zinc-900">{title}</h3>
            {subtitle ? <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p> : null}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// -- post job form (light, inline) --------------------------------------

const initialJobForm = {
  title: '',
  company: '',
  description: '',
  requiredSkills: '',
  minExperience: 0,
  minSalary: 0,
  maxSalary: 0,
};

const PostJobForm = ({ open, onClose, onCreated }) => {
  const [form, setForm] = useState(initialJobForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.title.trim() || !form.company.trim() || !form.description.trim()) {
      setError('Title, company and description are required.');
      return;
    }
    if (!form.requiredSkills.trim()) {
      setError('At least one required skill is needed.');
      return;
    }
    setSaving(true);
    try {
      await apiRequest('/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          minExperience: Number(form.minExperience || 0),
          minSalary: Number(form.minSalary || 0),
          maxSalary: Number(form.maxSalary || 0),
        }),
      });
      setForm(initialJobForm);
      onCreated?.();
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to create job.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LightModal open={open} title="Post a new role" subtitle="Students see the role only after admin approval." onClose={onClose} widthClass="max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Job title</label>
            <input className={inputBase} placeholder="Senior Frontend Engineer" value={form.title} onChange={(e) => updateField('title', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Company</label>
            <input className={inputBase} placeholder="Northwind" value={form.company} onChange={(e) => updateField('company', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Description</label>
          <textarea className={`${inputBase} min-h-[100px]`} placeholder="What the role involves…" value={form.description} onChange={(e) => updateField('description', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Required skills</label>
          <input className={inputBase} placeholder="react, typescript, node" value={form.requiredSkills} onChange={(e) => updateField('requiredSkills', e.target.value)} />
          <p className="mt-1 text-[11px] text-zinc-500">Comma-separated, lowercased on save.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Min. experience (yrs)</label>
            <input type="number" min="0" className={inputBase} value={form.minExperience} onChange={(e) => updateField('minExperience', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Min. salary (INR)</label>
            <input type="number" min="0" className={inputBase} value={form.minSalary} onChange={(e) => updateField('minSalary', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Max. salary (INR)</label>
            <input type="number" min="0" className={inputBase} value={form.maxSalary} onChange={(e) => updateField('maxSalary', e.target.value)} />
          </div>
        </div>
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
          <button type="button" onClick={onClose} className={btnGhost}>Cancel</button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Posting…' : 'Post role'}
          </button>
        </div>
      </form>
    </LightModal>
  );
};

// -- job row (recruiter, light) -----------------------------------------

const JobStatusPill = ({ status, approved }) => {
  if (status === 'closed') return <Chip tone="neutral">Closed</Chip>;
  if (!approved) return <Chip tone="warn">Awaiting approval</Chip>;
  return <Chip tone="accent">Live</Chip>;
};

const JobRow = ({ job, onViewApplicants, onViewDetails }) => (
  <div className="rounded-md border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:shadow-sm transition">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-heading font-semibold text-zinc-900 truncate">{job.title}</h3>
          <JobStatusPill status={job.status} approved={job.approved} />
        </div>
        <p className="mt-0.5 text-sm text-zinc-600">
          {job.company} · {formatLPA(job.minSalary)} – {formatLPA(job.maxSalary)} · {job.minExperience || 0}+ yrs
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(job.requiredSkills || []).slice(0, 8).map((skill) => (
            <Chip key={skill}>{skill}</Chip>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="text-right">
          <p className="text-2xl font-heading font-semibold text-zinc-900 leading-none tabular-nums">
            {Number(job.totalApplicants || 0)}
          </p>
          <p className="text-[11px] uppercase tracking-wider text-zinc-500 mt-1">Applicants</p>
        </div>
      </div>
    </div>
    <div className="mt-4 flex justify-end gap-2">
      <button onClick={() => onViewDetails?.(job)} className={btnGhost}>Details</button>
      <button onClick={() => onViewApplicants?.(job)} className={btnPrimary}>View applicants</button>
    </div>
  </div>
);

// -- page ---------------------------------------------------------------

const baseFilters = {
  search: '',
  status: '',
  minMatchScore: '',
  skill: '',
  sortBy: 'appliedAt',
  order: 'desc',
};

const RecruiterDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { jobs, loading, error, refetchJobs } = useJobs();
  const { interviews, scheduleInterview } = useInterviews({ upcoming: true });
  const [postOpen, setPostOpen] = useState(false);
  const [scheduleModal, setScheduleModal] = useState({ open: false, application: null });
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [applicantsState, setApplicantsState] = useState({
    open: false,
    jobTitle: '',
    jobId: '',
    loading: false,
    rows: [],
    error: '',
    page: 1,
    totalPages: 1,
    total: 0,
    filters: baseFilters,
  });

  const ownJobs = useMemo(
    () => jobs.filter((job) => String(job.postedBy) === String(user?.id)),
    [jobs, user?.id]
  );

  const totals = useMemo(() => {
    const totalJobs = ownJobs.length;
    const activeJobs = ownJobs.filter((j) => j.status === 'active').length;
    const pendingApproval = ownJobs.filter((j) => !j.approved).length;
    const applicants = ownJobs.reduce((s, j) => s + Number(j.totalApplicants || 0), 0);
    return { totalJobs, activeJobs, pendingApproval, applicants };
  }, [ownJobs]);

  const loadApplicants = async ({ jobId, page, filters, jobTitle }) => {
    setApplicantsState((prev) => ({
      ...prev,
      open: true,
      jobId,
      jobTitle,
      page,
      loading: true,
      error: '',
      filters,
    }));

    const params = new URLSearchParams({
      page: String(page),
      pageSize: '10',
      sortBy: filters.sortBy,
      order: filters.order,
    });
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.minMatchScore !== '') params.set('minMatchScore', filters.minMatchScore);
    if (filters.skill) params.set('skill', filters.skill);

    try {
      const data = await apiRequest(`/api/applications/job/${jobId}?${params.toString()}`);
      setApplicantsState((prev) => ({
        ...prev,
        loading: false,
        rows: data.applications || [],
        page: data.page || page,
        totalPages: data.totalPages || 1,
        total: data.total || 0,
      }));
      setSelectedIds(new Set());
    } catch (err) {
      setApplicantsState((prev) => ({
        ...prev,
        loading: false,
        rows: [],
        error: err.message || 'Failed to load applicants',
      }));
    }
  };

  const openApplicants = (job) =>
    loadApplicants({ jobId: job._id, page: 1, filters: baseFilters, jobTitle: job.title });

  const closeApplicants = () =>
    setApplicantsState({
      open: false,
      jobTitle: '',
      jobId: '',
      loading: false,
      rows: [],
      error: '',
      page: 1,
      totalPages: 1,
      total: 0,
      filters: baseFilters,
    });

  const updateFilter = (field, value) =>
    setApplicantsState((prev) => ({ ...prev, filters: { ...prev.filters, [field]: value } }));

  const applyFilters = () =>
    applicantsState.jobId &&
    loadApplicants({
      jobId: applicantsState.jobId,
      page: 1,
      filters: applicantsState.filters,
      jobTitle: applicantsState.jobTitle,
    });

  const resetFilters = () =>
    applicantsState.jobId &&
    loadApplicants({
      jobId: applicantsState.jobId,
      page: 1,
      filters: baseFilters,
      jobTitle: applicantsState.jobTitle,
    });

  const changeApplicantPage = (nextPage) =>
    applicantsState.jobId &&
    loadApplicants({
      jobId: applicantsState.jobId,
      page: nextPage,
      filters: applicantsState.filters,
      jobTitle: applicantsState.jobTitle,
    });

  const updateApplicationStatus = async (applicationId, status) => {
    await apiRequest(`/api/applications/${applicationId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    setApplicantsState((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => (row._id === applicationId ? { ...row, status } : row)),
    }));
  };

  const toggleRowSelected = (appId) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });

  const togglePageSelected = () => {
    const pageIds = applicantsState.rows.map((r) => r._id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const bulkUpdateStatus = async (status) => {
    const appIds = [...selectedIds];
    if (appIds.length === 0) return;
    setBulkLoading(true);
    setApplicantsState((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => (selectedIds.has(row._id) ? { ...row, status } : row)),
    }));
    try {
      await apiRequest('/api/applications/bulk-status', {
        method: 'POST',
        body: JSON.stringify({ appIds, status }),
      });
      setSelectedIds(new Set());
    } catch (err) {
      if (applicantsState.jobId) {
        await loadApplicants({
          jobId: applicantsState.jobId,
          page: applicantsState.page,
          filters: applicantsState.filters,
          jobTitle: applicantsState.jobTitle,
        });
      }
      setApplicantsState((prev) => ({ ...prev, error: err.message || 'Bulk update failed' }));
    } finally {
      setBulkLoading(false);
    }
  };

  const openScheduleModal = (application) => setScheduleModal({ open: true, application });
  const closeScheduleModal = () => setScheduleModal({ open: false, application: null });
  const handleScheduleInterview = async (payload) => {
    await scheduleInterview(payload);
    if (applicantsState.jobId) {
      await loadApplicants({
        jobId: applicantsState.jobId,
        page: applicantsState.page,
        filters: applicantsState.filters,
        jobTitle: applicantsState.jobTitle,
      });
    }
  };

  const initials = (user?.name || 'R')
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
              <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">Recruiter workspace</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            <button className="px-3 py-1.5 rounded-md text-zinc-900 bg-zinc-100 font-medium">Dashboard</button>
            <button onClick={() => navigate('/interviews')} className="px-3 py-1.5 rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition">
              Interviews
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
              <button onClick={logout} className={`${btnGhost} ml-1`}>Sign out</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header + KPIs */}
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">Hiring overview</p>
          <div className="mt-2 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl font-bold tracking-tight">
                Welcome back, {user?.name?.split(' ')[0]}.
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Manage roles, shortlist candidates and coordinate interviews.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={refetchJobs} className={btnGhost}>Refresh</button>
              <button onClick={() => setPostOpen(true)} className={btnAccent}>+ Post a role</button>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Roles posted', value: totals.totalJobs },
              { label: 'Active roles', value: totals.activeJobs },
              { label: 'Pending approval', value: totals.pendingApproval, tone: totals.pendingApproval ? 'warn' : null },
              { label: 'Total applicants', value: totals.applicants },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                <dt className="text-xs uppercase tracking-wider text-zinc-500">{kpi.label}</dt>
                <dd className="mt-1 flex items-baseline gap-2">
                  <span className="font-heading text-2xl font-semibold text-zinc-900">{kpi.value}</span>
                  {kpi.tone === 'warn' && kpi.value > 0 ? <Chip tone="warn">needs admin</Chip> : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column: jobs */}
          <div className="lg:col-span-2 space-y-6">
            <Section
              title="My roles"
              subtitle="Postings you've created"
              action={
                <button onClick={() => setPostOpen(true)} className={btnGhost}>
                  + New role
                </button>
              }
            >
              {loading ? <Spinner label="Loading roles…" /> : null}
              {!loading && error ? <p className="text-sm text-red-700">{error}</p> : null}
              {!loading && !error && ownJobs.length === 0 ? (
                <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50/50 py-10 text-center">
                  <p className="text-sm font-medium text-zinc-800">No roles yet</p>
                  <p className="mt-1 text-xs text-zinc-500">Post your first role — it'll go live once an admin approves it.</p>
                  <button onClick={() => setPostOpen(true)} className={`${btnAccent} mt-4`}>Post a role</button>
                </div>
              ) : null}
              {ownJobs.length > 0 ? (
                <div className="space-y-3">
                  {ownJobs.map((job) => (
                    <JobRow
                      key={job._id}
                      job={job}
                      onViewApplicants={openApplicants}
                      onViewDetails={() => navigate(`/jobs/${job._id}`)}
                    />
                  ))}
                </div>
              ) : null}
            </Section>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <Section title="Upcoming interviews" subtitle={`${interviews.length} scheduled`}>
              {interviews.length === 0 ? (
                <p className="text-sm text-zinc-500">Nothing on the calendar yet.</p>
              ) : (
                <ul className="space-y-3">
                  {interviews.slice(0, 4).map((iv) => (
                    <li key={iv._id} className="rounded-md border border-zinc-200 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-900 truncate">
                            {iv.studentId?.name || 'Candidate'}
                          </p>
                          <p className="text-xs text-zinc-500 truncate">{iv.jobId?.title || 'Role'}</p>
                        </div>
                        <Chip tone="accent">
                          {new Date(iv.scheduledAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </Chip>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {new Date(iv.scheduledAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}{' '}
                        · {iv.duration || 30} min · <span className="capitalize">{iv.meetingType || 'video'}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <button onClick={() => navigate('/interviews')} className={`${btnGhost} w-full mt-4`}>
                Open interview board
              </button>
            </Section>

            <section className="rounded-lg border border-zinc-900 bg-zinc-900 text-white p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-400">Tip</p>
              <h3 className="mt-2 font-heading text-lg font-semibold leading-snug">
                Bulk-shortlist top matches in one click.
              </h3>
              <p className="mt-2 text-sm text-zinc-300">
                Open a role's applicants, sort by match score, tick the top rows and shortlist all at once.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Applicants modal */}
      <LightModal
        open={applicantsState.open}
        title={`Applicants — ${applicantsState.jobTitle}`}
        subtitle={`${applicantsState.total} result(s)`}
        onClose={closeApplicants}
      >
        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <input
            className={inputBase}
            placeholder="Search by name or email"
            value={applicantsState.filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
          />
          <select
            className={inputBase}
            value={applicantsState.filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="interview">Interview</option>
            <option value="rejected">Rejected</option>
          </select>
          <input
            type="number"
            min="0"
            max="100"
            className={inputBase}
            placeholder="Min match %"
            value={applicantsState.filters.minMatchScore}
            onChange={(e) => updateFilter('minMatchScore', e.target.value)}
          />
          <input
            className={inputBase}
            placeholder="Skill contains"
            value={applicantsState.filters.skill}
            onChange={(e) => updateFilter('skill', e.target.value)}
          />
          <select
            className={inputBase}
            value={applicantsState.filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
          >
            <option value="appliedAt">Sort by applied date</option>
            <option value="matchScore">Sort by match score</option>
          </select>
          <select
            className={inputBase}
            value={applicantsState.filters.order}
            onChange={(e) => updateFilter('order', e.target.value)}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={applyFilters} className={btnPrimary}>Apply filters</button>
          <button onClick={resetFilters} className={btnGhost}>Reset</button>
        </div>

        {applicantsState.loading ? <Spinner label="Loading applicants…" /> : null}
        {!applicantsState.loading && applicantsState.error ? (
          <p className="text-sm text-red-700">{applicantsState.error}</p>
        ) : null}
        {!applicantsState.loading && !applicantsState.error && applicantsState.rows.length === 0 ? (
          <p className="text-sm text-zinc-500">No applicants yet for this role.</p>
        ) : null}

        {!applicantsState.loading && applicantsState.rows.length > 0 ? (
          <>
            {selectedIds.size > 0 ? (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                <span className="text-sm font-medium text-emerald-900">{selectedIds.size} selected</span>
                <button disabled={bulkLoading} onClick={() => bulkUpdateStatus('shortlisted')} className={btnAccent}>
                  Shortlist all
                </button>
                <button disabled={bulkLoading} onClick={() => bulkUpdateStatus('interview')} className={btnPrimary}>
                  Move to interview
                </button>
                <button disabled={bulkLoading} onClick={() => bulkUpdateStatus('rejected')} className={btnDanger}>
                  Reject all
                </button>
                <button onClick={() => setSelectedIds(new Set())} className={`${btnGhost} ml-auto`}>
                  Clear
                </button>
              </div>
            ) : null}

            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
                    <th className="px-6 py-2 w-8">
                      <input
                        type="checkbox"
                        aria-label="Select all on this page"
                        checked={
                          applicantsState.rows.length > 0 &&
                          applicantsState.rows.every((row) => selectedIds.has(row._id))
                        }
                        onChange={togglePageSelected}
                        className="accent-emerald-600"
                      />
                    </th>
                    <th className="px-3 py-2 font-medium">Student</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium text-right">Match</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Applied</th>
                    <th className="px-6 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {applicantsState.rows.map((row) => (
                    <tr
                      key={row._id}
                      className={selectedIds.has(row._id) ? 'bg-emerald-50/60' : 'hover:bg-zinc-50'}
                    >
                      <td className="px-6 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row._id)}
                          onChange={() => toggleRowSelected(row._id)}
                          className="accent-emerald-600"
                          aria-label={`Select ${row.studentId?.name || 'applicant'}`}
                        />
                      </td>
                      <td className="px-3 py-3 text-zinc-900 font-medium">{row.studentId?.name || '—'}</td>
                      <td className="px-3 py-3 text-zinc-600">{row.studentId?.email || '—'}</td>
                      <td className="px-3 py-3 text-right text-zinc-800 tabular-nums">
                        {Math.round(row.matchScore || 0)}%
                      </td>
                      <td className="px-3 py-3"><AppStatus status={row.status} /></td>
                      <td className="px-3 py-3 text-zinc-500">{formatDateShort(row.appliedAt)}</td>
                      <td className="px-6 py-3">
                        <div className="flex gap-1.5 justify-end">
                          <button onClick={() => updateApplicationStatus(row._id, 'shortlisted')} className={btnAccent}>
                            Shortlist
                          </button>
                          <button onClick={() => openScheduleModal(row)} className={btnGhost}>
                            Schedule
                          </button>
                          <button onClick={() => updateApplicationStatus(row._id, 'rejected')} className={btnDanger}>
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
              <p>
                {applicantsState.total} result(s) · Page {applicantsState.page} of {applicantsState.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={applicantsState.page <= 1}
                  onClick={() => changeApplicantPage(Math.max(1, applicantsState.page - 1))}
                  className={btnGhost}
                >
                  Previous
                </button>
                <button
                  disabled={applicantsState.page >= applicantsState.totalPages}
                  onClick={() =>
                    changeApplicantPage(Math.min(applicantsState.totalPages || 1, applicantsState.page + 1))
                  }
                  className={btnGhost}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : null}
      </LightModal>

      <PostJobForm open={postOpen} onClose={() => setPostOpen(false)} onCreated={refetchJobs} />

      <InterviewScheduleModal
        open={scheduleModal.open}
        onClose={closeScheduleModal}
        application={scheduleModal.application}
        onSchedule={handleScheduleInterview}
      />
    </div>
  );
};

export default RecruiterDashboard;
