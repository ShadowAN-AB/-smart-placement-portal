const statusConfig = {
  scheduled: { label: 'Scheduled', className: 'bg-intel-blue/20 text-intel-blue-light border-intel-blue/30' },
  completed: { label: 'Completed', className: 'bg-success/20 text-success border-success/30' },
  cancelled: { label: 'Cancelled', className: 'bg-error/20 text-error border-error/30' },
  rescheduled: { label: 'Rescheduled', className: 'bg-warning/20 text-warning border-warning/30' },
};

const InterviewStatusBadge = ({ status }) => {
  const config = statusConfig[status] || statusConfig.scheduled;
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full border ${config.className}`}>
      {config.label}
    </span>
  );
};

export default InterviewStatusBadge;
