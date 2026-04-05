const LoadingSpinner = ({ label = 'Loading...' }) => {
  return (
    <div className="flex items-center gap-3 text-slate-300">
      <span className="h-5 w-5 rounded-full border-2 border-slate-600 border-t-intel-blue animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
};

export default LoadingSpinner;
