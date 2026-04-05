import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';

export const useProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/api/students/profile');
      setProfile(data.profile || null);
    } catch (err) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = async (payload) => {
    const data = await apiRequest('/api/students/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    setProfile(data.profile);
    return data.profile;
  };

  return { profile, loading, error, refetchProfile: fetchProfile, saveProfile };
};
