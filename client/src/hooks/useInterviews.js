import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';

export const useInterviews = ({ upcoming = false, status = '' } = {}) => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchInterviews = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (upcoming) params.set('upcoming', 'true');
      if (status) params.set('status', status);

      const data = await apiRequest(`/api/interviews?${params.toString()}`);
      setInterviews(data.interviews || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch interviews');
    } finally {
      setLoading(false);
    }
  }, [upcoming, status]);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  const scheduleInterview = async (payload) => {
    const data = await apiRequest('/api/interviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await fetchInterviews();
    return data;
  };

  const rescheduleInterview = async (interviewId, payload) => {
    const data = await apiRequest(`/api/interviews/${interviewId}/reschedule`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    await fetchInterviews();
    return data;
  };

  const cancelInterview = async (interviewId, reason = '') => {
    const data = await apiRequest(`/api/interviews/${interviewId}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
    await fetchInterviews();
    return data;
  };

  const completeInterview = async (interviewId, payload) => {
    const data = await apiRequest(`/api/interviews/${interviewId}/complete`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    await fetchInterviews();
    return data;
  };

  return {
    interviews,
    loading,
    error,
    refetchInterviews: fetchInterviews,
    scheduleInterview,
    rescheduleInterview,
    cancelInterview,
    completeInterview,
  };
};
