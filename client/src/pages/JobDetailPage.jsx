import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MatchGauge from '../components/MatchGauge';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import { formatLPA } from '../utils/formatters';

const JobDetailPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applyState, setApplyState] = useState({ loading: false, message: '' });

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
    setApplyState({ loading: true, message: '' });
    try {
      await apiRequest('/api/applications', {
        method: 'POST',
        body: JSON.stringify({ jobId }),
      });
      setApplyState({ loading: false, message: 'Application submitted successfully' });
    } catch (err) {
      setApplyState({ loading: false, message: err.message || 'Failed to apply' });
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
        <LoadingSpinner label="Loading job details..." />
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-slate-100 space-y-4">
        <p className="text-error">{error || 'Job not found'}</p>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 md:p-10 text-slate-100">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          Back
        </Button>

        <section className="bg-slate-900 border border-slate-800 rounded-portal p-6 space-y-4 shadow-panel">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-heading font-bold">{job.title}</h1>
              <p className="text-slate-300">{job.company}</p>
              <p className="text-slate-400 text-sm mt-1">
                Salary: {formatLPA(job.minSalary)} - {formatLPA(job.maxSalary)}
              </p>
              <p className="text-slate-400 text-sm">Min Experience: {job.minExperience} years</p>
            </div>
            {user?.role === 'student' && job.match ? (
              <MatchGauge score={job.match.score} subtitle={job.match.explanation} />
            ) : null}
          </div>

          <p className="text-slate-200 leading-relaxed">{job.description}</p>

          <div className="flex flex-wrap gap-2">
            {(job.requiredSkills || []).map((skill) => (
              <Badge key={skill} tone="info">
                {skill}
              </Badge>
            ))}
          </div>

          {user?.role === 'student' ? (
            <div className="space-y-3 pt-2">
              <Button onClick={applyNow} disabled={applyState.loading}>
                {applyState.loading ? 'Applying...' : 'Apply Now'}
              </Button>
              {applyState.message ? (
                <p className={`text-sm ${applyState.message.includes('successfully') ? 'text-success' : 'text-error'}`}>
                  {applyState.message}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
};

export default JobDetailPage;
