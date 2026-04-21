import { useState } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import InterviewStatusBadge from '../components/InterviewStatusBadge';
import { useAuth } from '../context/AuthContext';
import { useInterviews } from '../hooks/useInterviews';
import { useNavigate } from 'react-router-dom';
import { formatInterviewDate, formatInterviewTime, getCountdown } from '../utils/formatters';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const meetingTypeIcons = {
  video: '📹',
  phone: '📞',
  'in-person': '🏢',
};

const InterviewsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('');
  const { interviews, loading, error, cancelInterview, completeInterview, refetchInterviews } = useInterviews(
    filter ? { status: filter } : {}
  );

  const [actionLoading, setActionLoading] = useState('');
  const [actionError, setActionError] = useState('');

  // Feedback modal state
  const [feedbackModal, setFeedbackModal] = useState({ open: false, interviewId: '', feedback: '', rating: '3' });

  const downloadCalendar = (interviewId) => {
    const token = localStorage.getItem('spp_token');
    window.open(`${API_BASE_URL}/api/interviews/${interviewId}/calendar?token=${token}`, '_blank');
  };

  const handleCancel = async (interviewId) => {
    const reason = window.prompt('Reason for cancellation (optional):');
    if (reason === null) return; // user pressed Cancel on prompt
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

  const openFeedbackModal = (interviewId) => {
    setFeedbackModal({ open: true, interviewId, feedback: '', rating: '3' });
  };

  const handleComplete = async () => {
    setActionLoading(feedbackModal.interviewId);
    setActionError('');
    try {
      await completeInterview(feedbackModal.interviewId, {
        feedback: feedbackModal.feedback,
        rating: Number(feedbackModal.rating),
      });
      setFeedbackModal({ open: false, interviewId: '', feedback: '', rating: '3' });
    } catch (err) {
      setActionError(err.message || 'Failed to complete');
    } finally {
      setActionLoading('');
    }
  };

  const isRecruiter = user?.role === 'recruiter';
  const dashboardPath = isRecruiter ? '/dashboard/recruiter' : '/dashboard/student';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wider text-intel-blue-light">Interview Center</p>
            <h1 className="text-3xl font-heading font-bold">All Interviews</h1>
            <p className="text-slate-400">Manage and track every interview at a glance</p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate(dashboardPath)}>
              ← Dashboard
            </Button>
            <Button variant="secondary" onClick={logout}>Logout</Button>
          </div>
        </header>

        {/* Filters */}
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-400">Filter:</span>
            {['', 'scheduled', 'completed', 'cancelled'].map((statusValue) => (
              <button
                key={statusValue}
                onClick={() => setFilter(statusValue)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  filter === statusValue
                    ? 'bg-intel-blue text-white border-intel-blue'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                {statusValue || 'All'}
              </button>
            ))}
          </div>
        </Card>

        {actionError ? <p className="text-sm text-error">{actionError}</p> : null}

        {/* Interview List */}
        {loading ? <LoadingSpinner label="Loading interviews..." /> : null}
        {!loading && error ? <p className="text-sm text-error">{error}</p> : null}
        {!loading && !error && interviews.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-slate-400">No interviews found.</p>
            </div>
          </Card>
        ) : null}

        {!loading && interviews.length > 0 ? (
          <div className="space-y-4">
            {interviews.map((iv) => (
              <Card
                key={iv._id}
                className={`hover:border-intel-blue/30 transition-colors ${
                  iv.status === 'cancelled' ? 'opacity-60' : ''
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  {/* Left — Details */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading font-bold text-lg text-slate-100">
                        {iv.jobId?.title || 'Position'}
                      </h3>
                      <InterviewStatusBadge status={iv.status} />
                    </div>

                    <p className="text-sm text-slate-400">{iv.jobId?.company || 'Company'}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                      <div>
                        <p className="text-slate-500 text-xs">Date</p>
                        <p className="text-slate-200">{formatInterviewDate(iv.scheduledAt)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Time</p>
                        <p className="text-slate-200">{formatInterviewTime(iv.scheduledAt)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Duration</p>
                        <p className="text-slate-200">{iv.duration || 30} min</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Type</p>
                        <p className="text-slate-200">
                          {meetingTypeIcons[iv.meetingType] || '📹'} {iv.meetingType}
                        </p>
                      </div>
                    </div>

                    {/* Candidate / Recruiter Info */}
                    <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                      <div>
                        <p className="text-slate-500 text-xs">Candidate</p>
                        <p className="text-slate-200">{iv.studentId?.name || '-'}</p>
                        <p className="text-slate-400 text-xs">{iv.studentId?.email || ''}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Recruiter</p>
                        <p className="text-slate-200">{iv.recruiterId?.name || '-'}</p>
                        <p className="text-slate-400 text-xs">{iv.recruiterId?.email || ''}</p>
                      </div>
                    </div>

                    {/* Notes */}
                    {iv.notes ? (
                      <div className="mt-2 text-xs text-slate-400 bg-slate-900/50 rounded p-2">
                        💡 {iv.notes}
                      </div>
                    ) : null}

                    {/* Feedback (completed) */}
                    {iv.status === 'completed' && iv.feedback ? (
                      <div className="mt-2 text-xs bg-success/10 border border-success/20 rounded p-2 text-success">
                        <strong>Feedback:</strong> {iv.feedback}
                        {iv.rating ? ` | Rating: ${'⭐'.repeat(iv.rating)}` : ''}
                      </div>
                    ) : null}

                    {/* Cancel reason */}
                    {iv.status === 'cancelled' && iv.cancelReason ? (
                      <div className="mt-2 text-xs bg-error/10 border border-error/20 rounded p-2 text-error">
                        <strong>Reason:</strong> {iv.cancelReason}
                      </div>
                    ) : null}
                  </div>

                  {/* Right — Actions */}
                  <div className="flex flex-col gap-2 md:items-end shrink-0">
                    {iv.status === 'scheduled' ? (
                      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                        ⏰ {getCountdown(iv.scheduledAt)}
                      </span>
                    ) : null}

                    {iv.meetingType === 'video' && iv.meetingLink && iv.status === 'scheduled' ? (
                      <a
                        href={iv.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-portal bg-intel-blue text-white hover:bg-intel-blue-dark transition"
                      >
                        🔗 Join Meeting
                      </a>
                    ) : null}

                    <Button
                      variant="ghost"
                      className="text-xs"
                      onClick={() => downloadCalendar(iv._id)}
                    >
                      📥 Calendar
                    </Button>

                    {/* Recruiter-only actions */}
                    {isRecruiter && iv.status === 'scheduled' ? (
                      <>
                        <Button
                          className="text-xs"
                          onClick={() => openFeedbackModal(iv._id)}
                          disabled={actionLoading === iv._id}
                        >
                          ✅ Complete
                        </Button>
                        <Button
                          variant="danger"
                          className="text-xs"
                          onClick={() => handleCancel(iv._id)}
                          disabled={actionLoading === iv._id}
                        >
                          ❌ Cancel
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : null}

        {/* Feedback / Complete Modal */}
        {feedbackModal.open ? (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-portal border border-slate-700 p-6 w-full max-w-md space-y-4">
              <h3 className="font-heading font-bold text-lg">Complete Interview</h3>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Feedback</label>
                <textarea
                  rows={3}
                  value={feedbackModal.feedback}
                  onChange={(e) =>
                    setFeedbackModal((prev) => ({ ...prev, feedback: e.target.value }))
                  }
                  placeholder="Describe the candidate's performance..."
                  className="w-full rounded-portal bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Rating</label>
                <select
                  value={feedbackModal.rating}
                  onChange={(e) =>
                    setFeedbackModal((prev) => ({ ...prev, rating: e.target.value }))
                  }
                  className="w-full rounded-portal bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100"
                >
                  <option value="1">⭐ 1 — Poor</option>
                  <option value="2">⭐⭐ 2 — Below Average</option>
                  <option value="3">⭐⭐⭐ 3 — Average</option>
                  <option value="4">⭐⭐⭐⭐ 4 — Good</option>
                  <option value="5">⭐⭐⭐⭐⭐ 5 — Excellent</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  variant="ghost"
                  onClick={() =>
                    setFeedbackModal({ open: false, interviewId: '', feedback: '', rating: '3' })
                  }
                >
                  Cancel
                </Button>
                <Button onClick={handleComplete} disabled={!!actionLoading}>
                  {actionLoading ? 'Saving...' : '✅ Mark Complete'}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
};

export default InterviewsPage;
