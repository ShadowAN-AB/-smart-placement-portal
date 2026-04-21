import Card from './common/Card';
import Button from './common/Button';
import LoadingSpinner from './common/LoadingSpinner';
import InterviewStatusBadge from './InterviewStatusBadge';
import { useInterviews } from '../hooks/useInterviews';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const formatInterviewDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatInterviewTime = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const getCountdown = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target - now;

  if (diff <= 0) return 'Now';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${minutes}m`;
  return `in ${minutes}m`;
};

const meetingTypeIcons = {
  video: '📹',
  phone: '📞',
  'in-person': '🏢',
};

const UpcomingInterviews = () => {
  const { interviews, loading, error } = useInterviews({ upcoming: true });

  const downloadCalendar = (interviewId) => {
    const token = localStorage.getItem('spp_token');
    window.open(`${API_BASE_URL}/api/interviews/${interviewId}/calendar?token=${token}`, '_blank');
  };

  return (
    <Card className="bg-gradient-to-br from-emerald-900/10 to-cyan-900/10 border-emerald-500/20">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-white text-sm">
          📅
        </span>
        <h3 className="font-heading font-bold text-lg">Upcoming Interviews</h3>
      </div>

      {loading ? <LoadingSpinner label="Loading interviews..." /> : null}
      {!loading && error ? <p className="text-sm text-error">{error}</p> : null}
      {!loading && !error && interviews.length === 0 ? (
        <p className="text-slate-400 text-sm">No upcoming interviews scheduled.</p>
      ) : null}

      {!loading && interviews.length > 0 ? (
        <div className="space-y-3">
          {interviews.map((interview) => (
            <div
              key={interview._id}
              className="bg-slate-800/60 border border-slate-700/50 rounded-portal p-4 hover:border-emerald-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-100 truncate">
                    {interview.jobId?.title || 'Position'}
                  </p>
                  <p className="text-sm text-slate-400">{interview.jobId?.company || 'Company'}</p>
                </div>
                <InterviewStatusBadge status={interview.status} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Date</p>
                  <p className="text-slate-200">{formatInterviewDate(interview.scheduledAt)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Time</p>
                  <p className="text-slate-200">{formatInterviewTime(interview.scheduledAt)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Duration</p>
                  <p className="text-slate-200">{interview.duration || 30} min</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Type</p>
                  <p className="text-slate-200">
                    {meetingTypeIcons[interview.meetingType] || '📹'} {interview.meetingType}
                  </p>
                </div>
              </div>

              {/* Countdown */}
              <div className="mt-2">
                <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  ⏰ {getCountdown(interview.scheduledAt)}
                </span>
              </div>

              {/* Notes */}
              {interview.notes ? (
                <div className="mt-2 text-xs text-slate-400 bg-slate-900/50 rounded p-2">
                  💡 {interview.notes}
                </div>
              ) : null}

              {/* Action buttons */}
              <div className="mt-3 flex gap-2 flex-wrap">
                {interview.meetingType === 'video' && interview.meetingLink ? (
                  <a
                    href={interview.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-portal bg-intel-blue text-white hover:bg-intel-blue-dark transition"
                  >
                    🔗 Join Meeting
                  </a>
                ) : null}

                <Button
                  variant="ghost"
                  className="text-xs px-3 py-1.5"
                  onClick={() => downloadCalendar(interview._id)}
                >
                  📥 Add to Calendar
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
};

export default UpcomingInterviews;
