import { useEffect, useState } from 'react';
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
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import { formatLPA } from '../utils/formatters';

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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wider text-intel-blue-light">Placement Cell Admin</p>
            <h1 className="text-3xl font-heading font-bold">Welcome, {user?.name}</h1>
            <p className="text-slate-400">Role: {user?.role}</p>
          </div>
          <Button variant="secondary" onClick={logout}>Logout</Button>
        </header>

        {loading ? <LoadingSpinner label="Loading analytics..." /> : null}
        {!loading && error ? <p className="text-sm text-error">{error}</p> : null}

        {!loading && analytics ? (
          <>
            <section className="grid md:grid-cols-4 gap-4">
              <Card>
                <p className="text-sm text-slate-400">Overall Placement Rate</p>
                <p className="text-3xl font-heading font-bold mt-2">{analytics.placementRate?.toFixed(1)}%</p>
              </Card>
              <Card>
                <p className="text-sm text-slate-400">Average Package</p>
                <p className="text-3xl font-heading font-bold mt-2">{formatLPA(analytics.avgPackage || 0)}</p>
              </Card>
              <Card>
                <p className="text-sm text-slate-400">Total Students</p>
                <p className="text-3xl font-heading font-bold mt-2">{analytics.totalStudents || 0}</p>
              </Card>
              <Card>
                <p className="text-sm text-slate-400">Top Companies</p>
                <p className="text-3xl font-heading font-bold mt-2">{analytics.topCompanies?.length || 0}</p>
              </Card>
            </section>

            <section className="grid lg:grid-cols-3 gap-5">
              <Card className="lg:col-span-2">
                <h2 className="text-xl font-heading font-bold">Placement Trends</h2>
                <p className="text-sm text-slate-400 mt-1">Applications vs placements by month</p>
                <div className="h-80 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.monthlyTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#cbd5e1" />
                      <YAxis stroke="#cbd5e1" />
                      <Tooltip
                        contentStyle={{
                          background: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="applications" fill="#5B9FED" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="placements" fill="#10B981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card>
                <h2 className="text-xl font-heading font-bold">Pending Approvals</h2>
                <p className="text-sm text-slate-400 mt-1">{approvalMeta.total} pending job(s)</p>
                <div className="mt-4 space-y-3 max-h-72 overflow-auto">
                  {approvals.length === 0 ? <p className="text-sm text-slate-400">No pending approvals</p> : null}
                  {approvals.map((job) => (
                    <div key={job._id} className="border border-slate-800 rounded-portal p-3">
                      <p className="font-semibold">{job.title}</p>
                      <p className="text-xs text-slate-400">{job.company}</p>
                      <Button className="mt-2 text-xs px-3 py-1" onClick={() => approveJob(job._id)}>
                        Approve
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            <Card>
              <h2 className="text-xl font-heading font-bold">Recent Placements</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-800">
                      <th className="py-2">Student</th>
                      <th className="py-2">Company</th>
                      <th className="py-2">Role</th>
                      <th className="py-2">Package</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analytics.recentPlacements || []).map((item) => (
                      <tr key={item._id} className="border-b border-slate-800/70">
                        <td className="py-3">{item.studentId?.name || '-'}</td>
                        <td className="py-3">{item.jobId?.company || '-'}</td>
                        <td className="py-3">{item.jobId?.title || '-'}</td>
                        <td className="py-3">{formatLPA(item.jobId?.maxSalary || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </main>
  );
};

export default AdminDashboard;
