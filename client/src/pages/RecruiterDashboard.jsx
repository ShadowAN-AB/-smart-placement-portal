import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ApplicationStatusBadge from '../components/ApplicationStatusBadge';
import JobCard from '../components/JobCard';
import JobForm from '../components/JobForm';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { useJobs } from '../hooks/useJobs';
import { apiRequest } from '../utils/api';
import { formatDateShort } from '../utils/formatters';

const RecruiterDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { jobs, loading, error, refetchJobs } = useJobs();
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
    filters: {
      search: '',
      status: '',
      minMatchScore: '',
      skill: '',
      sortBy: 'appliedAt',
      order: 'desc',
    },
  });

  const ownJobs = useMemo(() => {
    return jobs.filter((job) => String(job.postedBy) === String(user?.id));
  }, [jobs, user?.id]);

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
    } catch (err) {
      setApplicantsState((prev) => ({
        ...prev,
        loading: false,
        rows: [],
        error: err.message || 'Failed to load applicants',
      }));
    }
  };

  const openApplicants = async (job) => {
    const baseFilters = {
      search: '',
      status: '',
      minMatchScore: '',
      skill: '',
      sortBy: 'appliedAt',
      order: 'desc',
    };
    await loadApplicants({ jobId: job._id, page: 1, filters: baseFilters, jobTitle: job.title });
  };

  const closeApplicants = () => {
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
      filters: {
        search: '',
        status: '',
        minMatchScore: '',
        skill: '',
        sortBy: 'appliedAt',
        order: 'desc',
      },
    });
  };

  const updateFilter = (field, value) => {
    setApplicantsState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        [field]: value,
      },
    }));
  };

  const applyFilters = async () => {
    if (!applicantsState.jobId) return;
    await loadApplicants({
      jobId: applicantsState.jobId,
      page: 1,
      filters: applicantsState.filters,
      jobTitle: applicantsState.jobTitle,
    });
  };

  const resetFilters = async () => {
    if (!applicantsState.jobId) return;
    const baseFilters = {
      search: '',
      status: '',
      minMatchScore: '',
      skill: '',
      sortBy: 'appliedAt',
      order: 'desc',
    };
    await loadApplicants({
      jobId: applicantsState.jobId,
      page: 1,
      filters: baseFilters,
      jobTitle: applicantsState.jobTitle,
    });
  };

  const changeApplicantPage = async (nextPage) => {
    if (!applicantsState.jobId) return;
    await loadApplicants({
      jobId: applicantsState.jobId,
      page: nextPage,
      filters: applicantsState.filters,
      jobTitle: applicantsState.jobTitle,
    });
  };

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

  const totalApplicants = ownJobs.reduce((total, job) => total + Number(job.totalApplicants || 0), 0);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wider text-success">Recruiter Dashboard</p>
            <h1 className="text-3xl font-heading font-bold">Welcome, {user?.name}</h1>
            <p className="text-slate-400">Role: {user?.role}</p>
          </div>
          <Button variant="secondary" onClick={logout}>Logout</Button>
        </header>

        <section className="grid md:grid-cols-3 gap-4">
          <Card>
            <p className="text-sm text-slate-400">Total Jobs</p>
            <p className="text-3xl font-heading font-bold mt-2">{ownJobs.length}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-400">Total Applicants</p>
            <p className="text-3xl font-heading font-bold mt-2">{totalApplicants}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-400">Active Jobs</p>
            <p className="text-3xl font-heading font-bold mt-2">{ownJobs.filter((job) => job.status === 'active').length}</p>
          </Card>
        </section>

        <JobForm onCreated={refetchJobs} />

        <Card>
          <h2 className="text-xl font-heading font-bold">My Jobs</h2>
          <p className="text-sm text-slate-400 mt-1">Manage postings and review candidates</p>

          <div className="mt-4 space-y-4">
            {loading ? <LoadingSpinner label="Loading jobs..." /> : null}
            {!loading && error ? <p className="text-sm text-error">{error}</p> : null}
            {!loading && !error && ownJobs.length === 0 ? <p className="text-sm text-slate-400">No jobs posted yet.</p> : null}

            {ownJobs.map((job) => (
              <JobCard
                key={job._id}
                job={job}
                role="recruiter"
                onViewApplicants={openApplicants}
                onViewDetails={() => navigate(`/jobs/${job._id}`)}
              />
            ))}
          </div>
        </Card>

        <Modal open={applicantsState.open} title={`Applicants - ${applicantsState.jobTitle}`} onClose={closeApplicants}>
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            <input
              className="rounded-portal bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100"
              placeholder="Search by name/email"
              value={applicantsState.filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
            />
            <select
              className="rounded-portal bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100"
              value={applicantsState.filters.status}
              onChange={(event) => updateFilter('status', event.target.value)}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="interview">Interview</option>
              <option value="rejected">Rejected</option>
            </select>
            <input
              type="number"
              min="0"
              max="100"
              className="rounded-portal bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100"
              placeholder="Min Match %"
              value={applicantsState.filters.minMatchScore}
              onChange={(event) => updateFilter('minMatchScore', event.target.value)}
            />
            <input
              className="rounded-portal bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100"
              placeholder="Skill contains"
              value={applicantsState.filters.skill}
              onChange={(event) => updateFilter('skill', event.target.value)}
            />
            <select
              className="rounded-portal bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100"
              value={applicantsState.filters.sortBy}
              onChange={(event) => updateFilter('sortBy', event.target.value)}
            >
              <option value="appliedAt">Sort by Applied Date</option>
              <option value="matchScore">Sort by Match Score</option>
            </select>
            <select
              className="rounded-portal bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100"
              value={applicantsState.filters.order}
              onChange={(event) => updateFilter('order', event.target.value)}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>

          <div className="flex gap-2 mb-4">
            <Button onClick={applyFilters}>Apply Filters</Button>
            <Button variant="ghost" onClick={resetFilters}>Reset</Button>
          </div>

          {applicantsState.loading ? <LoadingSpinner label="Loading applicants..." /> : null}
          {!applicantsState.loading && applicantsState.error ? <p className="text-sm text-error">{applicantsState.error}</p> : null}
          {!applicantsState.loading && !applicantsState.error && applicantsState.rows.length === 0 ? (
            <p className="text-sm text-slate-400">No applicants yet for this job.</p>
          ) : null}

          {!applicantsState.loading && applicantsState.rows.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-800">
                      <th className="py-2">Student</th>
                      <th className="py-2">Email</th>
                      <th className="py-2">Match</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Applied</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applicantsState.rows.map((row) => (
                      <tr key={row._id} className="border-b border-slate-800/70">
                        <td className="py-3">{row.studentId?.name || '-'}</td>
                        <td className="py-3 text-slate-300">{row.studentId?.email || '-'}</td>
                        <td className="py-3">{Math.round(row.matchScore || 0)}%</td>
                        <td className="py-3"><ApplicationStatusBadge status={row.status} /></td>
                        <td className="py-3 text-slate-400">{formatDateShort(row.appliedAt)}</td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <Button className="text-xs px-2 py-1" onClick={() => updateApplicationStatus(row._id, 'shortlisted')}>Shortlist</Button>
                            <Button variant="ghost" className="text-xs px-2 py-1" onClick={() => updateApplicationStatus(row._id, 'interview')}>Interview</Button>
                            <Button variant="danger" className="text-xs px-2 py-1" onClick={() => updateApplicationStatus(row._id, 'rejected')}>Reject</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <p className="text-slate-400">
                  {applicantsState.total} result(s) | Page {applicantsState.page} of {applicantsState.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    disabled={applicantsState.page <= 1}
                    onClick={() => changeApplicantPage(Math.max(1, applicantsState.page - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={applicantsState.page >= applicantsState.totalPages}
                    onClick={() =>
                      changeApplicantPage(
                        Math.min(applicantsState.totalPages || 1, applicantsState.page + 1)
                      )
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </Modal>
      </div>
    </main>
  );
};

export default RecruiterDashboard;
