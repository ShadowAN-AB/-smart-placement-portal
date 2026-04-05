const Card = ({ children, className = '' }) => {
  return <article className={`bg-slate-900 border border-slate-800 rounded-portal p-5 shadow-panel ${className}`}>{children}</article>;
};

export default Card;
