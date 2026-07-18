import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { apiRequest } from '../utils/api';
import { formatLPA } from '../utils/formatters';

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

const btnPrimary =
  'rounded-md bg-zinc-900 text-white px-3 py-1.5 text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition';
const btnGhost =
  'rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition';
const btnAccent =
  'rounded-md bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition';

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

// -- KPI card with trend ------------------------------------------------

const Kpi = ({ label, value, hint, tone }) => (
  <div className="rounded-lg border border-zinc-200 bg-white px-4 py-4">
    <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
    <p className="mt-2 font-heading text-3xl font-semibold text-zinc-900 tabular-nums">{value}</p>
    {hint ? (
      <p className={`mt-1 text-xs ${tone === 'accent' ? 'text-emerald-700' : 'text-zinc-500'}`}>{hint}</p>
    ) : null}
  </div>
);

// -- page ---------------------------------------------------------------

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [approvalMeta, setApprovalMeta] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [analyticsData, approvalsData] = await Promise.all([
        apiRequest('/api/admin/analytics'),
        apiRequest('/api/admin/approvals?page=1&pageSize=20'),
      ]);
      setAnalytics(analyticsData.analytics || null);
      setApprovals(approvalsData.approvals || []);
      setApprovalMeta({
        page: approvalsData.page || 1,
        pageSize: approvalsData.pageSize || 20,
        total: approvalsData.total || 0,
        totalPages: approvalsData.totalPages || 1,
      });
    } catch (err) {
      setError(err.message || 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const approveJob = async (jobId) => {
    try {
      await apiRequest(`/api/admin/approve-job/${jobId}`, { method: 'POST' });
      await loadDashboard();
    } catch (err) {
      setError(err.message || 'Failed to approve job');
    }
  };

  const initials = (user?.name || 'A')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const trendData = analytics?.monthlyTrends || [];
  const topCompanies = analytics?.topCompanies || [];
  const maxCompanyCount = useMemo(
    () => topCompanies.reduce((m, c) => Math.max(m, Number(c.count || c.hires || 0)), 0) || 1,
    [topCompanies]
  );

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
              <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">Placement cell · Admin</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            <button className="px-3 py-1.5 rounded-md text-zinc-900 bg-zinc-100 font-medium">Overview</button>
            <button className="px-3 py-1.5 rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition">
              Approvals
              {approvalMeta.total > 0 ? (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-semibold">
                  {approvalMeta.total}
                </span>
              ) : null}
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
        {/* Header row */}
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">Placement analytics</p>
          <div className="mt-2 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl font-bold tracking-tight">
                Good morning, {user?.name?.split(' ')[0]}.
              </h1>
              <p className="mt-1 text-sm text-zinc-500">A snapshot of placements, approvals and hiring pipeline.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={loadDashboard} className={btnGhost}>Refresh</button>
              <button className={btnPrimary}>Export report</button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        {loading ? (
          <div className="rounded-lg border border-zinc-200 bg-white px-5 py-6">
            <Spinner label="Loading analytics…" />
          </div>
        ) : null}

        {!loading && analytics ? (
          <>
            {/* KPIs */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi
                label="Placement rate"
                value={`${(analytics.placementRate || 0).toFixed(1)}%`}
                hint="Shortlisted + interview / total apps"
                tone="accent"
              />
              <Kpi
                label="Average package"
                value={formatLPA(analytics.avgPackage || 0)}
                hint="Across placed students"
              />
              <Kpi
                label="Total students"
                value={(analytics.totalStudents || 0).toLocaleString('en-IN')}
                hint="Registered on the portal"
              />
              <Kpi
                label="Pending approvals"
                value={approvalMeta.total || 0}
                hint={approvalMeta.total ? 'Awaiting your review' : 'Nothing pending — nice.'}
                tone={approvalMeta.total ? undefined : 'accent'}
              />
            </section>

            {/* Chart + approvals */}
            <div className="grid lg:grid-cols-3 gap-6">
              <Section
                className="lg:col-span-2"
                title="Placement trends"
                subtitle="Applications vs placements — last 12 months"
                action={<span className="text-xs text-zinc-400">Monthly</span>}
              >
                <div className="h-80 -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                      <XAxis
                        dataKey="month"
                        stroke="#71717a"
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: '#e4e4e7' }}
                      />
                      <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(24,24,27,0.04)' }}
                        contentStyle={{
                          background: '#ffffff',
                          border: '1px solid #e4e4e7',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#18181b',
                        }}
                        labelStyle={{ color: '#52525b', fontWeight: 600 }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '12px', color: '#52525b' }}
                        iconType="circle"
                      />
                      <Bar dataKey="applications" fill="#18181b" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="placements" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Section>

              <Section
                title="Pending approvals"
                subtitle={`${approvalMeta.total} pending role(s)`}
                action={
                  approvals.length > 0 ? (
                    <button className="text-xs font-medium text-zinc-500 hover:text-zinc-800 transition">
                      See all
                    </button>
                  ) : null
                }
              >
                {approvals.length === 0 ? (
                  <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50/50 py-8 text-center">
                    <p className="text-sm font-medium text-zinc-800">All caught up</p>
                    <p className="mt-1 text-xs text-zinc-500">No roles waiting for approval.</p>
                  </div>
                ) : (
                  <ul className="space-y-3 max-h-80 overflow-auto pr-1 -mr-1">
                    {approvals.map((job) => (
                      <li key={job._id} className="rounded-md border border-zinc-200 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 truncate">{job.title}</p>
                            <p className="text-xs text-zinc-500 truncate">{job.company}</p>
                          </div>
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-800">
                            new
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500 line-clamp-2">
                          {job.description || 'No description provided.'}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => approveJob(job._id)} className={btnAccent}>
                            Approve
                          </button>
                          <button className={btnGhost}>View</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>

            {/* Top companies + recent placements */}
            <div className="grid lg:grid-cols-3 gap-6">
              <Section title="Top hiring companies" subtitle="By placement volume">
                {topCompanies.length === 0 ? (
                  <p className="text-sm text-zinc-500">No data yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {topCompanies.slice(0, 5).map((c, idx) => {
                      const count = Number(c.count || c.hires || 0);
                      const pct = Math.round((count / maxCompanyCount) * 100);
                      return (
                        <li key={c._id || c.company || idx}>
                          <div className="flex items-baseline justify-between text-sm">
                            <span className="font-medium text-zinc-900 truncate">
                              {c.company || c._id || '—'}
                            </span>
                            <span className="tabular-nums text-zinc-600">{count}</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Section>

              <Section
                className="lg:col-span-2"
                title="Recent placements"
                subtitle={`${(analytics.recentPlacements || []).length} shown`}
              >
                {(analytics.recentPlacements || []).length === 0 ? (
                  <p className="text-sm text-zinc-500">No placements recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto -mx-5 sm:-mx-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
                          <th className="px-5 sm:px-6 py-2 font-medium">Student</th>
                          <th className="px-3 py-2 font-medium">Company</th>
                          <th className="px-3 py-2 font-medium">Role</th>
                          <th className="px-5 sm:px-6 py-2 font-medium text-right">Package</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {(analytics.recentPlacements || []).map((item) => (
                          <tr key={item._id} className="hover:bg-zinc-50">
                            <td className="px-5 sm:px-6 py-3 text-zinc-900 font-medium">
                              {item.studentId?.name || '—'}
                            </td>
                            <td className="px-3 py-3 text-zinc-700">{item.jobId?.company || '—'}</td>
                            <td className="px-3 py-3 text-zinc-700">{item.jobId?.title || '—'}</td>
                            <td className="px-5 sm:px-6 py-3 text-right text-zinc-900 tabular-nums">
                              {formatLPA(item.jobId?.maxSalary || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
};

export default AdminDashboard;
