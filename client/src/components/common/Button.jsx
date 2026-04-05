const Button = ({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}) => {
  const variants = {
    primary: 'bg-intel-blue text-white hover:bg-intel-blue-dark',
    secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300',
    ghost: 'bg-transparent text-slate-200 hover:bg-slate-800 border border-slate-700',
    danger: 'bg-error text-white hover:opacity-90',
  };

  return (
    <button
      type={type}
      className={`rounded-portal px-4 py-2 font-semibold transition disabled:opacity-60 ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
