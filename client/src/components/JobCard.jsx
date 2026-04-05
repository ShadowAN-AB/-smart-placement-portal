import MatchGauge from './MatchGauge';
import Badge from './common/Badge';
import Button from './common/Button';
import { formatLPA } from '../utils/formatters';

const JobCard = ({ job, role, onApply, onViewApplicants, onViewDetails }) => {
  return (
    <article className="bg-slate-900 border border-slate-800 rounded-portal p-5 shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-heading font-bold text-slate-100">{job.title}</h3>
          <p className="text-slate-300 text-sm">{job.company}</p>
          <p className="text-slate-400 text-xs mt-1">
            {formatLPA(job.minSalary)} - {formatLPA(job.maxSalary)}
          </p>
        </div>
        {role === 'student' && job.match ? (
          <MatchGauge score={job.match.score} subtitle={job.match.explanation} />
        ) : null}
      </div>

      <p className="text-sm text-slate-300 mt-3 line-clamp-2">{job.description}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(job.requiredSkills || []).slice(0, 6).map((skill) => (
          <Badge key={skill} tone="info">
            {skill}
          </Badge>
        ))}
      </div>

      <div className="mt-4 flex gap-3">
        <Button variant="ghost" onClick={() => onViewDetails?.(job)}>
          View Details
        </Button>
        {role === 'student' ? (
          <Button onClick={() => onApply?.(job)}>Apply Now</Button>
        ) : (
          <Button onClick={() => onViewApplicants?.(job)}>View Applicants</Button>
        )}
      </div>
    </article>
  );
};

export default JobCard;
