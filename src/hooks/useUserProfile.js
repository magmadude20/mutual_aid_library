import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useUserProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(() => {
    if (!userId) return Promise.resolve();
    let isMounted = true;
    setLoading(true);
    setError(null);
    return (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('full_name, contact_info, latitude, longitude')
          .eq('id', userId)
          .maybeSingle();
        if (!isMounted) return;
        if (fetchError) throw fetchError;
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

  const hasLocation =
    profile?.latitude != null &&
    profile?.longitude != null &&
    Number.isFinite(profile.latitude) &&
    Number.isFinite(profile.longitude);

  return {
    fullName: profile?.full_name?.trim() || null,
    contactInfo: profile?.contact_info ?? null,
    latitude: hasLocation ? profile.latitude : null,
    longitude: hasLocation ? profile.longitude : null,
    loading,
    error,
    refetch,
  };
}
