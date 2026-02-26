import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/** Request items owned by userId that are visible to the current user (RLS applies). */
export function useUserVisibleRequests(userId) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setRequests([]);
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
          .select('id, name, description, user_id, type')
          .eq('user_id', userId)
          .eq('type', 'request')
          .order('name');
        if (!isMounted) return;
        if (fetchError) throw fetchError;
        setRequests(data ?? []);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load requests.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [userId]);

  return { requests, loading, error };
}
