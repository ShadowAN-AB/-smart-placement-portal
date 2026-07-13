import { useEffect, useState } from 'react';
import LoadingSpinner from './common/LoadingSpinner';
import Button from './common/Button';

const formatWhen = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const DeltaCell = ({ value }) => {
  if (value === null || value === undefined) {
    return <span className="text-slate-500">—</span>;
  }
  const isUp = value > 0;
  const isDown = value < 0;
  const cls = isUp ? 'text-success' : isDown ? 'text-error' : 'text-slate-400';
  const symbol = isUp ? '▲' : isDown ? '▼' : '·';
  return (
    <span className={`font-semibold ${cls}`}>
      {symbol} {isUp ? '+' : ''}{value}
    </span>
  );
};

const ScoreCell = ({ value }) => {
  if (value === null || value === undefined) return <span className="text-slate-500">—</span>;
  return <span>{value}%</span>;
};

const ResumeCompareView = ({ resumeA, resumeB, onClose, compareResumes, versions }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!resumeA || !resumeB || resumeA === resumeB) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    compareResumes(resumeA, resumeB)
      .then((data) => { if (!cancelled) setResult(data); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to compare'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [resumeA, resumeB, compareResumes]);

  const versionLabel = (resumeId) => {
    const v = versions.find((item) => String(item.resumeId) === String(resumeId));
    return v ? `v${v.version} (${v.filename})` : String(resumeId).slice(-6);
  };

  if (loading) return <LoadingSpinner label="Loading comparison..." />;
  if (error) return <p className="text-sm text-error">{error}</p>;
  if (!result) return null;

  const { diff, a, b } = result;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-bold">Comparing resumes</h2>
          <p className="text-sm text-slate-400">
            <span className="text-intel-blue-light">{versionLabel(a.resumeId)}</span>
            {' → '}
            <span className="text-intel-blue-light">{versionLabel(b.resumeId)}</span>
          </p>
        </div>
        {onClose ? (
          <Button variant="ghost" onClick={onClose}>Close</Button>
        ) : null}
      </header>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="rounded-portal border border-success/30 bg-success/5 p-4">
          <p className="text-xs uppercase tracking-wider text-success">Skills added</p>
          {diff.skillsAdded.length === 0 ? (
            <p className="text-sm text-slate-400 mt-2">None</p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-2">
              {diff.skillsAdded.map((s) => (
                <span key={s} className="text-xs px-2 py-1 rounded-full bg-success/20 text-success">{s}</span>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-portal border border-error/30 bg-error/5 p-4">
          <p className="text-xs uppercase tracking-wider text-error">Skills removed</p>
          {diff.skillsRemoved.length === 0 ? (
            <p className="text-sm text-slate-400 mt-2">None</p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-2">
              {diff.skillsRemoved.map((s) => (
                <span key={s} className="text-xs px-2 py-1 rounded-full bg-error/20 text-error">{s}</span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-heading font-semibold">Job score changes</h3>
        <p className="text-sm text-slate-400 mb-3">Sorted by biggest movement</p>
        <div className="overflow-x-auto rounded-portal border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-2 px-3">Role</th>
                <th className="py-2 px-3">Company</th>
                <th className="py-2 px-3 text-right">Before</th>
                <th className="py-2 px-3 text-right">After</th>
                <th className="py-2 px-3 text-right">Δ</th>
              </tr>
            </thead>
            <tbody>
              {diff.jobScoreDeltas.length === 0 ? (
                <tr><td colSpan={5} className="py-4 px-3 text-center text-slate-400">No overlapping jobs to compare</td></tr>
              ) : diff.jobScoreDeltas.map((row) => (
                <tr key={row.jobId} className="border-t border-slate-800/60">
                  <td className="py-2 px-3">{row.title || '-'}</td>
                  <td className="py-2 px-3 text-slate-400">{row.company || '-'}</td>
                  <td className="py-2 px-3 text-right"><ScoreCell value={row.before} /></td>
                  <td className="py-2 px-3 text-right"><ScoreCell value={row.after} /></td>
                  <td className="py-2 px-3 text-right"><DeltaCell value={row.delta} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-slate-500">
        A analyzed {formatWhen(a.analyzedAt)} · B analyzed {formatWhen(b.analyzedAt)}
      </p>
    </div>
  );
};

export default ResumeCompareView;
