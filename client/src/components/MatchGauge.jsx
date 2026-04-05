import { getMatchLabel } from '../utils/formatters';

const MatchGauge = ({ score = 0, size = 86, subtitle }) => {
  const value = Math.max(0, Math.min(100, Number(score || 0)));
  const angle = value * 3.6;

  return (
    <div className="flex items-center gap-3">
      <div
        className="rounded-full p-1"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(#1A73E8 ${angle}deg, #334155 ${angle}deg)`,
        }}
      >
        <div className="h-full w-full rounded-full bg-slate-900 flex items-center justify-center text-slate-100">
          <span className="text-sm font-bold">{Math.round(value)}%</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-100">{getMatchLabel(value)} Match</p>
        <p className="text-xs text-slate-400">{subtitle || 'Confidence score'}</p>
      </div>
    </div>
  );
};

export default MatchGauge;
