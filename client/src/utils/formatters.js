export const formatCurrencyINR = (amount) => {
  const value = Number(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatLPA = (amount) => {
  const value = Number(amount || 0);
  const lpa = value / 100000;
  return `${lpa.toFixed(1)} LPA`;
};

export const formatDateShort = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const getMatchLabel = (score) => {
  const value = Number(score || 0);
  if (value < 40) return 'Poor';
  if (value < 70) return 'Good';
  return 'Excellent';
};
