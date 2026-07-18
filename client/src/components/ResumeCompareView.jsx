import { useEffect, useState } from 'react';

const formatWhen = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const Spinner = ({ label }) => (
  <div className="flex items-center gap-2 text-sm text-zinc-500 py-2">
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
    <span>{label || 'Loading…'}</span>
  </div>
);

const DeltaCell = ({ value }) => {
  if (value === null || value === undefined) return <span className="text-zinc-400">—</span>;
  const isUp = value > 0;
  const isDown = value < 0;
  const cls = isUp ? 'text-emerald-700' : isDown ? 'text-red-700' : 'text-zinc-500';
  const symbol = isUp ? '▲' : isDown ? '▼' : '·';
  return (
    <span className={`font-semibold tabular-nums ${cls}`}>
      {symbol} {isUp ? '+' : ''}{value}
    </span>
  );
};

const ScoreCell = ({ value }) => {
  if (value === null || value === undefined) return <span className="text-zinc-400">—</span>;
  return <span className="tabular-nums">{value}%</span>;
};

const ResumeCompareView = ({ resumeA, resumeB, compareResumes, versions }) => {
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

  if (loading) return <Spinner label="Loading comparison…" />;
  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!result) return null;

  const { diff, a, b } = result;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-zinc-500">Comparing</p>
        <p className="mt-1 text-sm text-zinc-800">
          <span className="font-medium">{versionLabel(a.resumeId)}</span>
          <span className="mx-2 text-zinc-400">→</span>
          <span className="font-medium">{versionLabel(b.resumeId)}</span>
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs uppercase tracking-wider text-emerald-800">Skills added</p>
          {diff.skillsAdded.length === 0 ? (
            <p className="text-sm text-zinc-500 mt-2">None</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {diff.skillsAdded.map((s) => (
                <span key={s} className="text-xs px-2 py-0.5 rounded border border-emerald-200 bg-white text-emerald-800">{s}</span>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-xs uppercase tracking-wider text-red-700">Skills removed</p>
          {diff.skillsRemoved.length === 0 ? (
            <p className="text-sm text-zinc-500 mt-2">None</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {diff.skillsRemoved.map((s) => (
                <span key={s} className="text-xs px-2 py-0.5 rounded border border-red-200 bg-white text-red-700">{s}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-heading font-semibold text-zinc-900">Job score changes</h3>
        <p className="text-xs text-zinc-500 mb-3">Sorted by biggest movement</p>
        <div className="overflow-x-auto rounded-md border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="py-2 px-3 font-medium">Role</th>
                <th className="py-2 px-3 font-medium">Company</th>
                <th className="py-2 px-3 font-medium text-right">Before</th>
                <th className="py-2 px-3 font-medium text-right">After</th>
                <th className="py-2 px-3 font-medium text-right">Δ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {diff.jobScoreDeltas.length === 0 ? (
                <tr><td colSpan={5} className="py-4 px-3 text-center text-zinc-500">No overlapping jobs to compare</td></tr>
              ) : diff.jobScoreDeltas.map((row) => (
                <tr key={row.jobId} className="hover:bg-zinc-50">
                  <td className="py-2 px-3 text-zinc-900 font-medium">{row.title || '—'}</td>
                  <td className="py-2 px-3 text-zinc-600">{row.company || '—'}</td>
                  <td className="py-2 px-3 text-right text-zinc-800"><ScoreCell value={row.before} /></td>
                  <td className="py-2 px-3 text-right text-zinc-800"><ScoreCell value={row.after} /></td>
                  <td className="py-2 px-3 text-right"><DeltaCell value={row.delta} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        A analyzed {formatWhen(a.analyzedAt)} · B analyzed {formatWhen(b.analyzedAt)}
      </p>
    </div>
  );
};

export default ResumeCompareView;
