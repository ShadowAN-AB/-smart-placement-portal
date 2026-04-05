import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';

const makeQuery = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value);
    }
  });
  const raw = params.toString();
  return raw ? `?${raw}` : '';
};

export const useJobs = (filters = {}) => {
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(`/api/jobs${makeQuery(filters)}`);
      setJobs(data.jobs || []);
      setPagination({
        page: data.page || 1,
        pageSize: data.pageSize || 10,
        total: data.total || 0,
        totalPages: data.totalPages || 1,
      });
    } catch (err) {
      setError(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return { jobs, pagination, loading, error, refetchJobs: fetchJobs };
};
