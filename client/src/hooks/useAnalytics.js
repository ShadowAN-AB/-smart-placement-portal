import { useEffect, useState } from 'react';

export const useAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(false);
    setError('Admin analytics API is planned for next step');
    setAnalytics(null);
  }, []);

  return { analytics, loading, error };
};
