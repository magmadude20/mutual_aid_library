import { useCallback, useEffect, useState } from 'react';
import { getProfileById } from '../services/profilesService';

export function useUserProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(() => {
    if (!userId) return;
    let isMounted = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await getProfileById(userId);
        if (!isMounted) return;
        setProfile(data);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load profile.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    fullName: profile?.full_name?.trim() || null,
    contactInfo: profile?.contact_info ?? null,
    loading,
    error,
    refetch,
  };
}
