import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useCurrentProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }
    let isMounted = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('id', userId)
          .maybeSingle();
        if (!isMounted) return;
        if (fetchError) throw fetchError;
        setProfile(data ?? null);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load profile.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  return { profile, loading, error };
}
