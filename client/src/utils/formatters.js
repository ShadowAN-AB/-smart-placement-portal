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

export const formatInterviewDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatInterviewTime = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const getCountdown = (dateStr) => {
  if (!dateStr) return '';
  const diff = new Date(dateStr) - new Date();
  if (diff <= 0) return 'Now';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${minutes}m`;
  return `in ${minutes}m`;
};
