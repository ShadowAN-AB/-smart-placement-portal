import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ApplicationStatusBadge from '../components/ApplicationStatusBadge';
import JobCard from '../components/JobCard';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { useApplications } from '../hooks/useApplications';
import { useJobs } from '../hooks/useJobs';
import { useProfile } from '../hooks/useProfile';
import { apiRequest } from '../utils/api';
import { formatDateShort } from '../utils/formatters';

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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wider text-intel-blue-light">Student Dashboard</p>
            <h1 className="text-3xl font-heading font-bold">Welcome, {user?.name}</h1>
            <p className="text-slate-400">Role: {user?.role}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={seedProfile}>
              Auto Fill Profile
            </Button>
            <Button variant="secondary" onClick={logout}>
              Logout
            </Button>
          </div>
        </header>

        {actionError ? <p className="text-sm text-error">{actionError}</p> : null}

        <section className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <h2 className="text-xl font-heading font-bold">Personalized Recommendations</h2>
              <p className="text-slate-400 text-sm mt-1">Jobs ranked by Smart Match confidence score</p>

              <div className="mt-4 space-y-4">
                {jobsLoading ? <LoadingSpinner label="Loading recommendations..." /> : null}
                {!jobsLoading && jobsError ? <p className="text-sm text-error">{jobsError}</p> : null}
                {!jobsLoading && !jobsError && topRecommendations.length === 0 ? (
                  <p className="text-slate-400 text-sm">No jobs found yet. Ask a recruiter to post jobs.</p>
                ) : null}
                {topRecommendations.map((job) => (
                  <JobCard
                    key={job._id}
                    job={job}
                    role="student"
                    onApply={applyForJob}
                    onViewDetails={() => navigate(`/jobs/${job._id}`)}
                  />
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="text-xl font-heading font-bold">My Applications</h2>
              <p className="text-slate-400 text-sm mt-1">Track live status from recruiters</p>

              <div className="mt-4 overflow-x-auto">
                {applicationsLoading ? <LoadingSpinner label="Loading applications..." /> : null}
                {!applicationsLoading && applicationsError ? <p className="text-sm text-error">{applicationsError}</p> : null}
                {!applicationsLoading && !applicationsError && applications.length === 0 ? (
                  <p className="text-slate-400 text-sm">No applications yet.</p>
                ) : null}
                {!applicationsLoading && applications.length > 0 ? (
                  <>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-400 border-b border-slate-800">
                          <th className="py-2">Job</th>
                          <th className="py-2">Company</th>
                          <th className="py-2">Status</th>
                          <th className="py-2">Match</th>
                          <th className="py-2">Applied</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.map((application) => (
                          <tr key={application._id} className="border-b border-slate-800/70">
                            <td className="py-3">{application.jobId?.title || '-'}</td>
                            <td className="py-3 text-slate-300">{application.jobId?.company || '-'}</td>
                            <td className="py-3">
                              <ApplicationStatusBadge status={application.status} />
                            </td>
                            <td className="py-3">{Math.round(application.matchScore || 0)}%</td>
                            <td className="py-3 text-slate-400">{formatDateShort(application.appliedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <p className="text-slate-400">
                        Page {applicationPagination.page} of {applicationPagination.totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          disabled={applicationPagination.page <= 1}
                          onClick={() => setApplicationPage((prev) => Math.max(1, prev - 1))}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={applicationPagination.page >= applicationPagination.totalPages}
                          onClick={() =>
                            setApplicationPage((prev) =>
                              Math.min(applicationPagination.totalPages || 1, prev + 1)
                            )
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <h3 className="font-heading font-bold text-lg">Career Insights</h3>
              <p className="text-slate-400 text-sm mt-1">Bridge the gap for top opportunities</p>

              <div className="mt-4">
                <p className="text-sm text-slate-300 mb-2">Top Skills In Demand</p>
                <div className="flex flex-wrap gap-2">
                  {skillInsights.topSkills.map((skill) => (
                    <span key={skill} className="px-2 py-1 text-xs rounded-full bg-intel-blue/20 text-intel-blue-light border border-intel-blue/30">
                      {skill}
                    </span>
                  ))}
                  {skillInsights.topSkills.length === 0 ? <span className="text-xs text-slate-500">No data yet</span> : null}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm text-slate-300 mb-2">Skills To Add</p>
                <div className="flex flex-wrap gap-2">
                  {skillInsights.missingSkills.map((skill) => (
                    <span key={skill} className="px-2 py-1 text-xs rounded-full bg-warning/20 text-warning border border-warning/30">
                      {skill}
                    </span>
                  ))}
                  {skillInsights.missingSkills.length === 0 ? <span className="text-xs text-slate-500">You are aligned with current jobs</span> : null}
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="font-heading font-bold text-lg">Profile Snapshot</h3>
              {profileLoading ? <LoadingSpinner label="Loading profile..." /> : null}
              {!profileLoading ? (
                <div className="space-y-2 text-sm text-slate-300 mt-2">
                  <p>Experience: {profile?.yearsOfExperience || 0} years</p>
                  <p>Expected Salary: INR {(profile?.expectedSalary || 0).toLocaleString('en-IN')}</p>
                  <p className="text-slate-400">{profile?.bio || 'No bio added yet'}</p>
                </div>
              ) : null}
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
};

export default StudentDashboard;
