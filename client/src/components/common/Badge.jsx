const Badge = ({ children, tone = 'default' }) => {
  const tones = {
    default: 'bg-slate-700 text-slate-100',
    success: 'bg-success/20 text-success border border-success/40',
    warning: 'bg-warning/20 text-warning border border-warning/40',
    error: 'bg-error/20 text-error border border-error/40',
    info: 'bg-intel-blue/20 text-intel-blue-light border border-intel-blue/40',
  };

  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${tones[tone] || tones.default}`}>{children}</span>;
};

export default Badge;
