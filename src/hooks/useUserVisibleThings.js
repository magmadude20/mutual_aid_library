import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/** Items owned by userId that are visible to the current user (RLS applies). */
export function useUserVisibleThings(userId) {
  const [things, setThings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setThings([]);
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
          .from('items')
          .select('id, name, description, user_id')
          .eq('user_id', userId)
          .order('name');
        if (!isMounted) return;
        if (fetchError) throw fetchError;
        setThings(data ?? []);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load things.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [userId]);

  return { things, loading, error };
}
